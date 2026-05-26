# Plasmart Reports

Dashboard interno de reportería de campañas digitales para **Plasmart**
(grupo Transfil, Córdoba). Consolida datos de Google Ads, Meta Ads y
Google Analytics 4, y genera análisis automáticos con Claude AI.

Producción: https://plasmart-reports.vercel.app

---

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **IA:** Claude API (Sonnet 4.6) vía Anthropic SDK
- **Hosting:** Vercel (plan Hobby)
- **Auth:** Supabase Auth con Google OAuth, restringido al dominio
  `@transfil.com.ar`

## Setup local

```bash
# 1. Clonar y entrar
git clone 
cd plasmart-reports

# 2. Instalar deps
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con los valores reales (ver sección "Variables")

# 4. Levantar dev server
npm run dev
```

Abrir `http://localhost:3000`.

### Variables de entorno

Todas necesarias. Las que no son `NEXT_PUBLIC_*` son server-only y
nunca llegan al cliente.

| Variable | Dónde sacarla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (local) o el dominio de Vercel |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `ANTHROPIC_MODEL` | ID del modelo (ej: `claude-sonnet-4-6`) |
| `ANTHROPIC_MAX_TOKENS` | `1024` por default |

**Env vars opcionales (sólo en la Edge Function `ingest-reports`):**

| Variable | Default | Propósito |
|---|---|---|
| `DRIVE_FOLDER_GADS_ADSETS` | unset | Folder ID de Drive con el sheet semanal de ad groups de Google Ads. Si está vacía, la ingesta de adsets se saltea. |
| `DRIVE_FOLDER_GADS_ADS` | unset | Folder ID de Drive con el sheet semanal de ads de Google Ads. Si está vacía, la ingesta de ads se saltea. |
| `DRIVE_FOLDER_META_ADSETS` | unset | Folder ID de Drive con el sheet semanal de ad sets de Meta Ads. |
| `DRIVE_FOLDER_META_ADS` | unset | Folder ID de Drive con el sheet semanal de ads de Meta Ads. |

En Vercel las mismas variables van en Settings → Environment Variables,
aplicadas a Production y Preview (no Development). Las env vars de la
Edge Function se setean con `supabase secrets set NOMBRE=valor`.

## Comandos

```bash
npm run dev          # dev server en :3000 con Turbopack
npm run build        # build de producción
npm run type-check   # solo type-check, no compila
npm run lint         # ESLint

npx supabase db push                      # aplicar migrations al remoto
npx supabase functions deploy ingest-reports   # deploy edge function
```

## Estructura

```
app/                       # Next.js App Router
  api/
    analyze/route.ts       # POST → llama a Claude para analizar
    ingest/run/route.ts    # POST → dispara la edge function ingest-reports
  auth/                    # callback OAuth y logout
  admin/                   # /admin: log de ingestas, freshness, botón forzar
  dashboard/               # /dashboard: reporte completo
  login/                   # /login: wordmark + botón Google
components/                # Componentes React (server + client mezclados)
  charts/                  # SVG vanilla (cost-evolution, top-campaigns)
  ai-analysis.tsx          # Bloque del análisis de Claude
lib/
  supabase/                # Clientes browser, server, middleware
  ai/                      # Builder del prompt + hash de cache
  queries.ts               # Capa de queries del dashboard (RPCs)
  admin-queries.ts         # Queries de /admin
  types.ts                 # Tipos del dominio
  filters.ts               # Parseo de filtros desde URL
  format.ts                # Formateo es-AR
  svg-charts.ts            # Helpers de geometría para los gráficos
proxy.ts                   # Middleware de Next: refresca sesión + guard de dominio
supabase/
  migrations/              # SQL versionado
  functions/ingest-reports # Edge Function que ingesta de Drive y GA4
```

## Flujo de datos

1. **Extractores** (lunes 04:00 ART): los Sheets de Meta en Drive los
   generan tres apps de **Google Apps Script** (campañas / ad sets / ads)
   que consultan la Meta Marketing API. Google Ads genera los suyos vía
   *Google Ads Scripts*; GA4 lo trae la edge function directo de la API.
   Detalle en `docs/extractores-appscript.md`.
2. **Cron diario** (lunes a domingo, 06:00 ART): `pg_cron` invoca
   `ingest-reports` vía HTTP.
3. **Edge function** lee el Sheet más reciente de cada carpeta de Drive
   (GAds, Meta) y la API de GA4, normaliza y hace upsert en
   `dim_campaign`, `fact_campaign_daily`, `fact_ga_daily`.
4. **Dashboard** consulta vistas y RPCs via Supabase, renderiza con
   Server Components.
5. **Análisis IA** se dispara on-demand (botón en `/dashboard`),
   cachea por hash de filtros + última fecha de datos.

> **Conversiones de Meta = consultas de mensajería.** Las campañas de Meta
> optimizan para mensajería, así que la columna `conversions` trae las
> conversaciones de mensajería iniciadas (`action_type`
> `onsite_conversion.messaging_conversation_started_7d`, que ya agrega
> WhatsApp + Messenger + Instagram Direct), no conversiones de píxel. El
> CPA de Meta es entonces "costo por consulta". Ver
> `docs/extractores-appscript.md`.

> **Conversiones de Google Ads = proxy de clic, NO comparable 1:1 con
> Meta.** Google sólo ve el clic al botón de WhatsApp, no la conversación
> (que pasa en WhatsApp, fuera de Google), así que sobre-cuenta respecto
> de las consultas reales. Además, la columna "Conversiones" suma las
> acciones marcadas como primarias: cuidado con *key events* de GA4
> auto-importados que la inflan (sobre todo en Performance Max), y con
> valores de conversión sintéticos que vuelven ficticio el ROAS de GAds.
> Detalle en `CLAUDE.md` → "Conversiones de Google Ads".

## Cómo cambiar cosas comunes

### Cambiar el horario del cron

En el SQL Editor de Supabase:

```sql
select cron.unschedule('ingest-reports-daily');
select cron.schedule(
  'ingest-reports-daily',
  '0 9 * * *',  -- 09:00 UTC = 06:00 ART; cambiar acá
  $$ select net.http_post(...) $$  -- ver migration original
);
```

### Forzar una ingesta a demanda

Dos formas:
1. Desde la UI: `/admin` → botón "Forzar ingesta ahora". Cooldown de 10 min.
2. Manual desde curl con la service role key (ver `app/api/ingest/run/route.ts`).

### Agregar una métrica al dashboard

Por ejemplo, agregar "ROAS" como KPI:

1. **BD:** ya existe la columna `roas` en `fact_campaign_daily` (calculada).
   Sumarla a la RPC `dashboard_kpi_totals` en una migración nueva.
2. **Tipos:** agregar `roas: KpiWithDelta` a `DashboardKpis` en `lib/types.ts`.
3. **Query:** agregar el campo en `fetchKpis()` en `lib/queries.ts`.
4. **UI:** agregar un `<KpiCard>` más en `components/kpi-grid.tsx`.

Aplicar la migración con `npx supabase db push` y correr `npm run type-check`.

### Cambiar el prompt de Claude

Tres archivos, todos en `lib/ai/`:

- `prompt.ts` → `SYSTEM_PROMPT`: rol, restricciones, formato de salida.
- `account-context.ts` → contexto estable de Plasmart (productos, público,
  objetivos comerciales).
- `prompt.ts` → `buildUserContent()`: qué datos del período se le mandan
  en cada llamada.

Después de cambiar el prompt, las respuestas cacheadas anteriores siguen
mostrándose hasta que el filtro o la fecha máxima de datos cambien. Para
regenerar manualmente, click en "Regenerar análisis" desde el dashboard.

### Cambiar el modelo de Claude

Cambiar `ANTHROPIC_MODEL` en `.env.local` y en Vercel. Modelos válidos
en `https://docs.claude.com/en/docs/about-claude/models`.
Costo por análisis con Sonnet 4.6: ~USD 0.02–0.05.
Para abaratar a ~USD 0.003: usar Haiku.

### Agregar un nuevo usuario

No hay registro propio. Auth es Google OAuth y solo deja entrar a emails
`@transfil.com.ar`. Si el usuario tiene esa cuenta corporativa, simplemente
hace click en "Ingresar con Google" en `/login`.

Para cambiar el dominio permitido: editar `lib/supabase/middleware.ts`
y la condición `auth.email() LIKE '%@transfil.com.ar'` en las políticas
RLS de la migración inicial.

## Backfill manual de datos

Si necesitás cargar datos históricos (más allá del rango que la edge
function captura por default):

1. Exportar el reporte desde el publisher (Google Ads, Meta) con
   granularidad diaria.
2. Generar el SQL de upsert (idempotente) y ejecutarlo en el SQL Editor.
   Patrón en `docs/backfill-gads.sql` (ejemplo del backfill de mar–may 2026).
3. Refrescar las vistas materializadas:
   `select refresh_all_materialized_views();`

Para GA4 conviene modificar la edge function para aceptar `?from=&to=`
y disparar una corrida con el rango deseado, en lugar de exportar manual.

Para **Meta** el camino más limpio no es SQL manual sino subir `DAYS_BACK`
en los extractores de Apps Script, correr `main()` una vez y forzar la
ingesta: el upsert por `(date, *_id)` reescribe el histórico en el lugar.
Paso a paso en `docs/extractores-appscript.md`.

Para **Google Ads** vale el mismo patrón: ampliar la ventana del Google
Ads Script, re-exportar y forzar la ingesta. Sirve especialmente para
corregir conversiones históricas mal medidas, porque cambiar qué acciones
de conversión cuentan como primarias en Google Ads **recalcula la columna
"Conversiones" también para fechas pasadas** — al re-pulear, la historia
llega ya corregida y el upsert la pisa.

## Operación

- **Monitoreo:** `/admin` muestra las últimas 20 corridas con status,
  filas insertadas y errores.
- **Si una ingesta falla:** ver el `error_message` en la tabla, y los
  logs detallados en Supabase Dashboard → Edge Functions →
  ingest-reports → Logs.
- **Backups:** Supabase free incluye backups diarios de los últimos 7 días.
  Los Sheets crudos en Drive son la fuente de verdad para reprocesar
  GAds y Meta. GA4 se puede re-pedir vía API.

## Backlog conocido

- CPA muestra "0,00" cuando son fraccionarios chicos (`<1` ARS). Bug menor.
- Tooltips nativos en nombres truncados del top de campañas (3 líneas SVG).
- Líneas del gráfico de evolución se pegan visualmente cuando GAds y Meta
  tienen valores cercanos.
- Mobile: tablas (`campaign-table`, `publisher-comparison`,
  `ga4-source-medium-table`) y el chart de top campañas usan layout de
  cards en `<sm` para evitar scroll horizontal; los KPIs reflowean
  a 1 columna. Si se agrega una tabla nueva, replicar el patrón
  (lista `<ul>` de cards en mobile, `<table>` en desktop) en vez de
  apoyarse en `overflow-x-auto`.
- Notificaciones por email cuando falla la ingesta semanal (Fase 6.x
  pendiente, opcional).
- Backfill GA4 vía edge function parametrizada por rango (pendiente).

## Workflow de desarrollo

- **Discusión arquitectural:** chat web (claude.ai) antes de implementar.
- **Implementación:** Claude Code en local con commits descriptivos en español.
- **Deploy:** push a `main` → Vercel deploya automáticamente en 1-2 min.
- **Migrations:** versionadas en `supabase/migrations/`. Aplicar con
  `npx supabase db push`.
