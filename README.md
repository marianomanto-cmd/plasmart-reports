# Plasmart Reports

Panel de control interno para **Plasmart** (grupo Transfil, Córdoba). Consolida
Google Ads, Meta Ads y Google Analytics 4 en un único cockpit dark-mode con
análisis automático de Claude AI.

Producción: https://plasmart-reports.vercel.app

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| IA | Claude API (Sonnet 4.6) vía Anthropic SDK |
| Hosting | Vercel (plan Hobby) |
| Auth | Supabase Auth con Google OAuth, dominio `@transfil.com.ar` |

Tipografía: **IBM Plex Sans** (UI) + **IBM Plex Mono** (cifras, clase `.font-data`).
Tema: dark-first "Control Room" — acero oscuro `#0a0e14` + plasma `#ff6a2c`.

---

## Setup local

```bash
# 1. Clonar
git clone <repo>
cd plasmart-reports

# 2. Instalar deps
npm install

# 3. Variables de entorno
cp .env.local.example .env.local
# Editar con los valores reales (ver tabla abajo)

# 4. Dev server
npm run dev
```

Abrir `http://localhost:3000`.

### Variables de entorno

Las que no llevan `NEXT_PUBLIC_` son server-only y **nunca** llegan al
navegador.

| Variable | Dónde obtenerla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (local) o dominio Vercel |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `ANTHROPIC_MODEL` | ID del modelo (ej: `claude-sonnet-4-6`) |
| `ANTHROPIC_MAX_TOKENS` | `1024` por default |

**Opcionales — solo en la Edge Function `ingest-reports`:**

| Variable | Propósito |
|---|---|
| `DRIVE_FOLDER_GADS_ADSETS` | Folder ID de Drive con el sheet semanal de ad groups de Google Ads |
| `DRIVE_FOLDER_GADS_ADS` | Folder ID de Drive con el sheet semanal de ads de Google Ads |
| `DRIVE_FOLDER_META_ADSETS` | Folder ID de Drive con el sheet semanal de ad sets de Meta Ads |
| `DRIVE_FOLDER_META_ADS` | Folder ID de Drive con el sheet semanal de ads de Meta Ads |

Si una variable opcional no está seteada, ese nivel de granularidad se saltea
sin error. En Vercel: Settings → Environment Variables (Production + Preview).
En Supabase: `supabase secrets set NOMBRE=valor`.

---

## Comandos

```bash
npm run dev          # dev server en :3000 con Turbopack
npm run build        # build de producción
npm run type-check   # solo type-check
npm run lint         # ESLint

npx supabase db push                          # aplicar migrations al remoto
npx supabase functions deploy ingest-reports  # deploy edge function
```

---

## Estructura

```
app/
  (auth)/                    # Rutas públicas
    login/                   # /login — pantalla Google OAuth
  (dashboard)/               # Rutas protegidas (guard en middleware)
    page.tsx                 # /dashboard — Cockpit: KPIs + alertas + embudo + eficiencia + IA
    layout.tsx               # Aplica AppShell a todas las rutas /dashboard/*
    paid/
      page.tsx               # /dashboard/paid — Campañas: distribución + cuadrante + tabla
      gads/page.tsx          # Publisher forzado a Google Ads
      meta/page.tsx          # Publisher forzado a Meta Ads
    traffic/page.tsx         # /dashboard/traffic — GA4: KPIs + source/medium
    analysis/page.tsx        # /dashboard/analysis — Hub IA: rápido + experto (Corey Haines)
    comparativa/page.tsx     # Legacy → redirect a /dashboard/paid (preserva QS)
    detalle/page.tsx         # Legacy → redirect a /dashboard/paid (preserva QS)
    corey-haines/page.tsx    # Legacy → redirect a /dashboard/analysis (preserva QS)
  admin/
    page.tsx                 # /admin — log de ingestas, freshness, log de IA
  api/
    analyze/route.ts         # POST → llama a Claude (con cache por hash de filtros)
    ingest/run/route.ts      # POST → dispara la edge function ingest-reports
    filters/available/       # GET → opciones disponibles para los filtros

components/
  app-shell/
    app-shell.tsx            # Layout principal: Topbar + <main> full-width
    topbar.tsx               # Header sticky: marca + TopNav + TopbarFilters + menú usuario
    top-nav.tsx              # Nav horizontal desktop (Resumen / Campañas / Tráfico / Análisis IA)
    topbar-filters.tsx       # Chip de período + botón Filtros → Sheet drawer con InlineFilters
    sidebar-nav.tsx          # Nav del Sheet mobile (hamburger)
  cockpit/                   # Componentes exclusivos del cockpit /dashboard
    panel.tsx                # Panel base (surface-card + glow-stripe opcional)
    headline-strip.tsx       # 4 KPI tiles con sparklines y deltas
    alert-feed.tsx           # Feed "Qué mirar" — danger / warn / info
    funnel-chart.tsx         # Embudo 3 etapas: Impresiones → Clics → Consultas
    spend-distribution.tsx   # Barras de distribución de gasto por campaña
    efficiency-quadrant.tsx  # Scatter CPA vs volumen — cuadrantes Escalar/Vigilar/Optimizar/Cortar
  charts/
    cost-evolution.tsx       # Tremor AreaChart: evolución GAds vs Meta (cyan / violet)
    top-campaigns.tsx        # BarChart top campañas por inversión
    top-adsets.tsx           # BarChart top ad groups
    top-ads.tsx              # BarChart top ads
  ui/                        # Primitivos shadcn (button, card, sheet, dropdown…)
  tremor/                    # Wrappers dark-mode de Tremor (area-chart, bar-chart, card…)
  ai-analysis.tsx            # Bloque del análisis de Claude
  campaign-table.tsx         # Tabla de campañas con soporte mobile (cards) / desktop (table)
  inline-filters.tsx         # Formulario de filtros (dentro del Sheet drawer)
  filters-bar.tsx            # Barra de filtros cliente (fetches /api/filters/available)
  plasmart-mark.tsx          # Logotipo spark plasma (SVG inline)
  sparkline.tsx              # Micro-gráfico SVG de tendencia
  kpi-card.tsx               # Card de KPI con stripe de color y delta
  publisher-comparison.tsx   # Tabla comparativa GAds vs Meta
  …y otros

lib/
  insights.ts                # Capa de derivación: buildAlerts, buildSpendDistribution,
                             #   buildFunnel, buildEfficiencyPoints → tipos cockpit
  queries.ts                 # Queries del dashboard (RPCs Supabase)
  admin-queries.ts           # Queries de /admin
  types.ts                   # Tipos del dominio (DashboardKpis, CampaignRow, etc.)
  filters.ts                 # Parseo de filtros desde URL search params
  format.ts                  # Formateo es-AR (moneda, número, porcentaje)
  dates.ts                   # Helpers de fechas y rangos
  utils.ts                   # cn() y utilidades genéricas
  ai/
    prompt.ts                # SYSTEM_PROMPT + buildUserContent()
    account-context.ts       # Contexto estático de Plasmart para Claude
    corey-prompt.ts          # Prompt del análisis experto (Corey Haines)
    hash.ts                  # Hash de filtros para cache de IA
  supabase/
    client.ts                # Cliente browser
    server.ts                # Cliente server (cookies)
    middleware.ts            # Guard de dominio + refresco de sesión
  tremor/                    # Helpers internos de Tremor

proxy.ts                     # Middleware Next.js (refresco sesión + redireccionamiento)

supabase/
  migrations/                # SQL versionado (aplicar con npx supabase db push)
  functions/
    ingest-reports/          # Edge Function: lee Drive + GA4 API, upsert en DB

docs/
  redesign/
    cockpit-mockup.html      # Mockup de referencia del rediseño Control Room
  auditoria-ui-ux.md         # Auditoría de accesibilidad y diseño (jun-2026)
  extractores-appscript.md   # Documentación de los extractores de Apps Script

.claude/
  skills/
    ui-ux-pro-max/           # Motor de inteligencia de diseño (CLI Python)
    beautiful-mermaid/       # Diagramas Mermaid mejorados
    promptify/               # Optimización de prompts
    ultrathink/              # Razonamiento profundo
    …y otros 18 skills de intellectronica/agent-skills
```

---

## Rutas del dashboard

| Ruta | Descripción |
|---|---|
| `/dashboard` | **Cockpit** — KPIs headline, alertas "Qué mirar", embudo, distribución de gasto, cuadrante de eficiencia, IA inline |
| `/dashboard/paid` | **Campañas** — distribución + cuadrante + tabla, con granularidad por campaña / ad group / ad |
| `/dashboard/paid/gads` | Idem, publisher forzado a Google Ads |
| `/dashboard/paid/meta` | Idem, publisher forzado a Meta Ads |
| `/dashboard/traffic` | **Tráfico** — GA4 KPIs + tabla source/medium |
| `/dashboard/analysis` | **Análisis IA** — hub con modo rápido y modo experto (Corey Haines) |
| `/admin` | Log de ingestas, freshness, log de respuestas de IA |

Las rutas `/dashboard/comparativa`, `/dashboard/detalle` y
`/dashboard/corey-haines` son redirects legacy que preservan los query params.

---

## Flujo de datos

1. **Extractores** (lunes ~04:00 ART): Google Ads Script y tres apps de
   Google Apps Script (campañas / ad sets / ads de Meta) generan Sheets en
   Drive. Detalle en `docs/extractores-appscript.md`.
2. **Cron** (lunes 06:00 ART): `pg_cron` invoca `ingest-reports` vía HTTP.
3. **Edge function** lee el Sheet más reciente de cada carpeta de Drive
   y la API de GA4, normaliza y hace upsert en `dim_campaign`,
   `fact_campaign_daily`, `fact_ga_daily` (y opcionalmente `dim_adset`,
   `fact_adset_daily`, `dim_ad`, `fact_ad_daily` si las env vars están seteadas).
4. **Dashboard** consulta vistas y RPCs vía Supabase, renderiza con Server Components.
5. **Análisis IA** se dispara on-demand, cachea por hash de filtros + fecha de datos.

> **Conversiones de Meta = consultas de mensajería.** Las campañas de Meta
> optimizan para WhatsApp, así que `conversions` trae conversaciones de
> mensajería iniciadas (`action_type`
> `onsite_conversion.messaging_conversation_started_7d`). El CPA de Meta es
> "costo por consulta".

> **Conversiones de Google Ads = proxy de clic, NO comparable 1:1 con Meta.**
> Google solo ve el clic al botón de WhatsApp, no la conversación. Además, la
> columna suma acciones de conversión marcadas como primarias: cuidado con
> key events de GA4 auto-importados que la inflan (especialmente en PMax).
> Detalle completo en `CLAUDE.md`.

---

## Cómo cambiar cosas comunes

### Cambiar el horario del cron

En el SQL Editor de Supabase:

```sql
select cron.unschedule('ingest-reports-daily');
select cron.schedule(
  'ingest-reports-daily',
  '0 9 * * *',  -- 09:00 UTC = 06:00 ART
  $$ select net.http_post(...) $$  -- ver migration original
);
```

### Forzar una ingesta a demanda

- Desde la UI: `/admin` → botón "Forzar ingesta ahora" (cooldown 10 min).
- Manual: curl con la service role key (ver `app/api/ingest/run/route.ts`).

### Agregar una métrica al dashboard

Por ejemplo, "ROAS":

1. **BD:** agregar `roas` a la RPC `dashboard_kpi_totals` en una migración nueva.
2. **Tipos:** agregar `roas: KpiWithDelta` a `DashboardKpis` en `lib/types.ts`.
3. **Query:** agregar el campo en `fetchKpis()` en `lib/queries.ts`.
4. **UI:** agregar un `<KpiCard>` en la HeadlineStrip o KpiGrid correspondiente.

Aplicar la migración con `npx supabase db push` y correr `npm run type-check`.

### Cambiar el prompt de Claude

Tres archivos en `lib/ai/`:

- `prompt.ts` → `SYSTEM_PROMPT`: rol, restricciones, formato de salida.
- `account-context.ts` → contexto estático de Plasmart.
- `prompt.ts` → `buildUserContent()`: datos del período que se envían en cada llamada.

Las respuestas cacheadas siguen mostrándose hasta que cambia el hash de filtros.
Para regenerar: click en "Regenerar análisis" en el dashboard.

### Cambiar el modelo de Claude

Cambiar `ANTHROPIC_MODEL` en `.env.local` y en Vercel.
Costo estimado por análisis: ~USD 0.02–0.05 con Sonnet 4.6; ~USD 0.003 con Haiku.

### Agregar un usuario

No hay registro propio. Solo ingresan emails `@transfil.com.ar` vía Google OAuth.
Para cambiar el dominio: editar `lib/supabase/middleware.ts` y las políticas RLS
(`auth.email() LIKE '%@transfil.com.ar'` en la migration inicial).

### Backfill de datos históricos

Para cargar datos fuera del rango que cubre la edge function:

- **Meta / Google Ads:** ampliar la ventana en el extractor de Apps Script /
  Google Ads Script, correr `main()`, y forzar la ingesta. El upsert por
  `(date, *_id)` pisa el histórico en su lugar. Útil también para corregir
  conversiones mal medidas (cambiar las primarias en Google Ads recalcula
  la columna también para fechas pasadas).
- **GA4:** modificar la edge function para aceptar `?from=&to=` y disparar
  una corrida con el rango deseado.
- Después de cualquier backfill: `select refresh_all_materialized_views();`

---

## Operación

- **Monitoreo:** `/admin` → últimas 20 corridas con status, filas insertadas y errores.
- **Si una ingesta falla:** ver el `error_message` en la tabla y los logs en
  Supabase Dashboard → Edge Functions → ingest-reports → Logs.
- **Backups:** Supabase free incluye backups diarios de los últimos 7 días.
  Los Sheets en Drive son la fuente de verdad para reprocesar GAds y Meta.

---

## Skills de Claude Code

En `.claude/skills/` viven skills versionadas con el repo:

- **`ui-ux-pro-max`** — auditoría de diseño, sistema de diseño, paletas, guías UX.
  ```bash
  python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
    "internal analytics dashboard b2b dark" --design-system
  python3 .claude/skills/ui-ux-pro-max/scripts/search.py "contrast accessibility" --domain ux
  ```
  La auditoría completa está en `docs/auditoria-ui-ux.md`.
- **`intellectronica/agent-skills`** — 22 skills: beautiful-mermaid, promptify,
  markdown-converter, ultrathink, context7, etc.

---

## Backlog conocido

- CPA muestra "0,00" cuando el valor es fraccionario menor a 1 ARS.
- Tooltips en nombres de campaña truncados (top charts).
- Mobile: al agregar una tabla nueva, replicar el patrón cards `<sm` /
  table `≥sm` en lugar de `overflow-x-auto`.
- Backfill GA4 vía edge function parametrizada por rango (pendiente).
- Notificaciones por email al fallar la ingesta semanal (Fase 6.x, opcional).

---

## Workflow de desarrollo

- **Discusión arquitectural:** chat web (claude.ai) antes de implementar.
- **Implementación:** Claude Code con commits descriptivos en español.
- **Deploy:** push a `main` → Vercel deploya en 1–2 min.
- **Migrations:** versionadas en `supabase/migrations/`. Aplicar con
  `npx supabase db push`.
