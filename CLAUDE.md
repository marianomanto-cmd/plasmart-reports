# Plasmart Reports — Contexto del proyecto

Este archivo es leído automáticamente por Claude Code al abrir el proyecto.
Contiene el contexto necesario para que Claude entienda el dominio, stack,
convenciones y lineamientos antes de hacer cualquier cambio.

## Qué es este proyecto

Dashboard interno de reportería para **Plasmart**, empresa de Córdoba (Argentina)
dedicada al corte láser y plasma de acero. Plasmart es parte del grupo Transfil.

El dashboard consolida datos de campañas digitales en Google Ads, Meta Ads
y Google Analytics 4. La gerencia lo usa para ver performance semanal con
filtros por fecha, publisher, tipo y nombre de campaña. Cada vista del
reporte incluye un análisis automático generado por Claude AI con
recomendaciones puntuales.

**Volumen esperado:** bajo. ~5-10 usuarios internos, ~20-50 campañas activas.
**Frecuencia de actualización de datos:** semanal (lunes 06:00 ART).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind v4 + Tremor |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Hosting | Vercel (plan Hobby) |
| IA | Claude API (Sonnet 4.6) vía Anthropic SDK |
| Auth | Supabase Auth con Google OAuth, dominio @transfil.com.ar |

## Estructura del proyecto

```
app/
  (auth)/login/              # Pantalla Google OAuth
  (dashboard)/               # Rutas protegidas
    page.tsx                 # /dashboard — Cockpit
    layout.tsx               # Aplica AppShell
    paid/                    # /dashboard/paid — Campañas
      gads/page.tsx          # Publisher forzado: Google Ads
      meta/page.tsx          # Publisher forzado: Meta Ads
    traffic/page.tsx         # /dashboard/traffic — GA4
    analysis/page.tsx        # /dashboard/analysis — Hub IA
    comparativa/             # Legacy → redirect a /paid
    detalle/                 # Legacy → redirect a /paid
    corey-haines/            # Legacy → redirect a /analysis
  admin/page.tsx             # /admin — log ingestas + IA
  api/
    analyze/route.ts         # POST → Claude (cache por hash)
    ingest/run/route.ts      # POST → dispara ingest-reports
    filters/available/       # GET → opciones de filtros

components/
  app-shell/
    app-shell.tsx            # Topbar + <main> full-width (sin sidebar)
    topbar.tsx               # Header sticky: marca + TopNav + filtros + usuario
    top-nav.tsx              # Nav horizontal desktop (4 items)
    topbar-filters.tsx       # Chip período + Sheet drawer con InlineFilters
    sidebar-nav.tsx          # Nav del Sheet mobile
  cockpit/                   # Componentes del cockpit /dashboard
    panel.tsx                # surface-card + glow-stripe opcional
    headline-strip.tsx       # 4 KPI tiles con sparklines y deltas
    alert-feed.tsx           # Feed "Qué mirar" (danger/warn/info)
    funnel-chart.tsx         # Embudo 3 etapas SVG
    spend-distribution.tsx   # Barras de distribución de gasto
    efficiency-quadrant.tsx  # Scatter CPA vs volumen (4 cuadrantes)
  charts/
    cost-evolution.tsx       # Tremor AreaChart evolución GAds vs Meta
    top-campaigns.tsx        # BarChart top campañas
    top-adsets.tsx / top-ads.tsx
  ui/                        # Primitivos shadcn
  tremor/                    # Wrappers dark-mode de Tremor
  plasmart-mark.tsx          # Logotipo spark plasma
  ai-analysis.tsx            # Bloque análisis Claude
  campaign-table.tsx         # Tabla con fallback mobile (cards)
  inline-filters.tsx         # Formulario de filtros
  …y otros componentes de UI

lib/
  insights.ts                # buildAlerts / buildSpendDistribution / buildFunnel / buildEfficiencyPoints
  queries.ts                 # Queries del dashboard (RPCs Supabase)
  admin-queries.ts           # Queries de /admin
  types.ts                   # Tipos del dominio
  filters.ts                 # Parseo de filtros desde URL
  format.ts                  # Formateo es-AR (moneda, número, %)
  dates.ts                   # Helpers de fechas
  ai/
    prompt.ts                # SYSTEM_PROMPT + buildUserContent()
    account-context.ts       # Contexto estático de Plasmart
    corey-prompt.ts          # Prompt modo experto
    hash.ts                  # Hash de filtros para cache
  supabase/
    client.ts / server.ts / middleware.ts
  tremor/                    # Helpers internos de Tremor

proxy.ts                     # Middleware Next.js (sesión + guard)
supabase/
  migrations/                # SQL versionado
  functions/ingest-reports/  # Edge Function ingesta

docs/
  redesign/cockpit-mockup.html
  auditoria-ui-ux.md
  extractores-appscript.md

.claude/skills/              # Skills versionadas (ui-ux-pro-max + agent-skills)
```

## Modelo de datos

Tablas principales en Postgres (esquema simplificado):

- **dim_campaign** — dimensión de campañas (id, publisher, external_id, name, type, status)
- **dim_adset** — dimensión de ad groups (id, campaign_id, external_id, name, status) — *v1.4, sólo Google Ads*
- **dim_ad** — dimensión de ads individuales (id, adset_id, external_id, name, status) — *v1.4, sólo Google Ads*
- **fact_campaign_daily** — hechos diarios (date, campaign_id, impressions, clicks, conversions, cost_ars, revenue_ars)
- **fact_adset_daily** — hechos diarios por ad group (mismas métricas) — *v1.4*
- **fact_ad_daily** — hechos diarios por ad (mismas métricas) — *v1.4*
- **fact_ga_daily** — datos diarios de Google Analytics 4
- **ai_analysis_cache** — cache de respuestas de Claude por hash de filtros
- **ingestion_log** — log de cada ejecución del ingest

Vistas materializadas:
- **mv_campaign_weekly** — agregados semanales
- **mv_campaign_monthly** — agregados mensuales
- **mv_publisher_summary** — totales por publisher

RPCs adicionales (v1.4):
- **dashboard_adset_rows** — filas agregadas por ad group
- **dashboard_ad_rows** — filas agregadas por ad

**Importante:** la moneda es siempre ARS (Plasmart factura GAds en pesos).

### Granularidad de análisis (v1.6)

La granularidad es un **filtro global** más, vive en la `FiltersBar`
junto a Publisher / Tipo / Campaña, y se persiste en la URL como
`?granularity=adset|ad` (el default `campaign` no se serializa).

Las opciones son:
- `campaign` (default): vista por campañas.
- `adset`: vista por ad groups (aplica a Google Ads y Meta Ads).
- `ad`: vista por ads individuales (aplica a ambos publishers).

Cada vista consume el filtro como mejor le sirve:
- `/dashboard/paid` muestra la tabla y el top chart correspondientes
  al nivel elegido. Comparativa GAds vs Meta sólo se muestra cuando el
  publisher es "todos".
- `/dashboard/analysis` (Corey Haines + AI rápido) toma la granularidad
  del filtro y le manda a Claude el drill_down correspondiente. No hay
  selector específico en la vista — el filtro global la setea.
- `/dashboard` (overview) y `/dashboard/traffic` ignoran la granularidad
  (KPIs agregados y tráfico GA4 no tienen ese eje), pero el valor
  persiste en la URL al navegar.

Si las tablas `fact_adset_daily` / `fact_ad_daily` están vacías para el
período + publisher elegido, el payload manda `drill_down.has_data =
false` y el prompt le dice a Claude que aclare la falta y caiga a
nivel campaña en el output.

> **Histórico**: en v1.4 adset/ad estaba limitado a Google Ads. En v1.5
> se extendió a Meta. En v1.6 se eliminaron los selectores duplicados
> (Pills en /paid, Picker en CoreyHainesAnalysis) y se consolidó como
> un campo más de la FiltersBar.

### Ingesta de adsets y ads (Google Ads + Meta Ads)

La Edge Function `ingest-reports` procesa hasta cuatro sheets opcionales
además de los de campañas:

| Env var | Source | Publisher |
|---|---|---|
| `DRIVE_FOLDER_GADS_ADSETS` | `gads_adsets` | Google Ads |
| `DRIVE_FOLDER_GADS_ADS` | `gads_ads` | Google Ads |
| `DRIVE_FOLDER_META_ADSETS` | `meta_adsets` | Meta Ads |
| `DRIVE_FOLDER_META_ADS` | `meta_ads` | Meta Ads |

Si una env var no está seteada, el source se saltea sin generar log de
error. Esto permite activar la granularidad por publisher de forma
progresiva sin tocar la ingesta core.

**Formato esperado de adsets (Google Ads, 10 columnas)** — Google Ads sí
manda `status` por fila vía el reporte de Ads Scripts:
```
date | campaign_id | adset_id | adset_name | status | impressions
| clicks | cost | conversions | revenue
```

**Formato esperado de ads (Google Ads, 11 columnas)**:
```
date | campaign_id | adset_id | ad_id | ad_name | status
| impressions | clicks | cost | conversions | revenue
```

**Formato esperado de adsets (Meta, 9 columnas)** — Meta no manda
`status` por fila desde Insights (las pausadas no devuelven datos), así
que se omite y el normalizer defaultea a `active`:
```
date | campaign_id | adset_id | adset_name | impressions
| clicks | spend | conversions | revenue
```

**Formato esperado de ads (Meta, 10 columnas)**:
```
date | campaign_id | adset_id | ad_id | ad_name | impressions
| clicks | spend | conversions | revenue
```

Los `*_id` son los external_id de la red correspondiente (los mismos que
ya se ingestan a nivel campaña). El handler resuelve los uuids haciendo
join contra `dim_campaign.external_id` (filtrando por publisher para
evitar colisiones entre redes) y `dim_adset.external_id`.

Los Sheets de Meta en Drive los generan tres apps de **Google Apps
Script** (una por nivel: campañas / ad sets / ads) que consultan la Meta
Marketing API y escriben el formato de columnas de arriba. No viven en
este repo pero su fuente y operación están documentadas en
`docs/extractores-appscript.md`.

### Conversiones de Meta = consultas de WhatsApp

Las campañas de Meta de Plasmart buscan **consultas por WhatsApp**. Meta
las cuenta como "Resultados" / conversaciones de mensajería, NO como
"Conversiones" (esa métrica depende de eventos de píxel/web que no se
disparan acá → daría 0). Los extractores de Apps Script las traen del
`action_type` `onsite_conversion.messaging_conversation_started_7d` y las
escriben en la columna `conversions` que la ingesta ya consume. Ese
`action_type` ya agrega todas las plataformas de mensajería (WhatsApp +
Messenger + Instagram Direct) en un solo número, así que no hay que sumar
métricas por canal.

Por eso, en Meta, `conversions` y el CPA derivado (`cost / conversions`)
significan **consultas de WhatsApp** y **costo por consulta**. Las
campañas de alcance (objetivo awareness) quedan en 0 conversiones por
diseño: se juzgan por reach/CPM, no por conversiones. El contexto de IA
(campo `tracking`) debería aclararlo para que Claude no las lea como
"ineficientes".

> No usamos la columna "Results" de Meta directo: es polimórfica (cambia
> de significado según el objetivo de cada campaña). Por eso sumamos
> `action_type` específicos.

### Conversiones de Google Ads = proxy de clic, no comparable con Meta

La columna `conversions` de Google Ads suma las **acciones de conversión
marcadas como primarias** ("se incluye en Conversiones") en la cuenta.
Dos cosas a tener presentes:

1. **Es un proxy, no la consulta real.** El objetivo del sitio es generar
   consultas por WhatsApp, pero Google **no puede ver la conversación**
   (pasa en WhatsApp, fuera de Google): a lo sumo cuenta el *clic* al
   botón de WhatsApp. Por eso sobre-cuenta respecto de las consultas
   efectivas. A diferencia de Meta —que sí ve las conversaciones
   iniciadas— las conversiones de GAds y Meta **no son la misma unidad**:
   el dashboard las muestra lado a lado pero NO hay que compararlas 1:1.

2. **Cuidado con lo que se cuenta como primaria.** Un *key event* de GA4
   auto-importado (vista de página, scroll, etc.) marcado como conversión
   primaria infla el número muchísimo, sobre todo en Performance Max, que
   optimiza agresivamente hacia lo que se le diga que cuente. En may-2026
   esto disparó >1.000 "conversiones"/semana ficticias en una PMax hasta
   que se sacó el key event auto-importado del set de primarias.

> Cambiar qué acciones cuentan como primarias **recalcula la columna
> "Conversiones" también para fechas pasadas**. Por eso, para corregir
> histórico mal medido, alcanza con re-exportar el rango con el Google Ads
> Script y re-ingestar (el upsert pisa). El **valor de conversión** suele
> ser sintético (un valor fijo asignado por lead), así que el revenue/ROAS
> de GAds es un proxy, no facturación real.

### Refactor del ingest (v1.4.1)

Las funciones `ingestAdsets(supabase, publisher, ...)` e
`ingestAds(supabase, publisher, ...)` son agnósticas al publisher: la
única diferencia entre gads y meta a este nivel es el `.eq("publisher", ...)`
al resolver `campaign_id`. Por eso un mismo helper sirve para las cuatro
fuentes opcionales (gads/meta × adset/ad).

## Estructura de rutas (v1.7 — cockpit)

| Ruta | Contenido | Nav item |
|---|---|---|
| `/dashboard` | **Cockpit/Resumen**: headline KPIs + "Qué mirar" (alertas) + embudo + distribución de gasto + cuadrante de eficiencia + tendencia + IA inline | Resumen |
| `/dashboard/paid` | **Campañas**: comparativa GAds vs Meta + distribución + cuadrante de eficiencia + tabla, con selector de granularidad | Campañas |
| `/dashboard/paid/gads` | Idem, publisher forzado a gads | ↳ Google Ads |
| `/dashboard/paid/meta` | Idem, publisher forzado a meta | ↳ Meta Ads |
| `/dashboard/traffic` | GA4: KPIs + tabla source/medium | Tráfico |
| `/dashboard/analysis` | Hub IA con toggle rápido / experto (Corey Haines) | Análisis IA |
| `/admin` | Log de ingestas, freshness, log de IA | Admin |

> **v1.7 (jun-2026): rediseño "Control Room".** La IA pasó de "páginas
> por fuente de dato" a "páginas por pregunta": el home es un cockpit que
> responde *cómo vamos* y *qué mirar* de un vistazo. Las anomalías de
> campaña (antes badges de 9px en la tabla) ahora son el feed de alertas;
> se sumaron embudo, distribución de gasto y cuadrante de eficiencia
> (`lib/insights.ts` + `components/cockpit/*`). El mockup de referencia
> está en `docs/redesign/cockpit-mockup.html`.

Rutas legacy (`/dashboard/comparativa`, `/dashboard/detalle`,
`/dashboard/corey-haines`) **redirigen** preservando los search params, no
se borran de un saque para no romper bookmarks ni linkeos previos.

## AppShell (v1.7 — sin sidebar)

Layout principal en `components/app-shell/`:

- **Sin sidebar.** La navegación vive en el header: `TopNav` renderiza
  cuatro items horizontales (Resumen / Campañas / Tráfico / Análisis IA)
  directamente en el topbar, visibles en desktop (≥md).
- **Mobile:** hamburger en el topbar abre un Sheet (shadcn) con
  `SidebarNav` — el mismo árbol de items pero en formato vertical.
- **Topbar** sticky: marca → `TopNav` (desktop) → `TopbarFilters`
  (chip de período + botón "Filtros" → Sheet drawer) → menú de usuario.
- **Filtros en drawer:** `InlineFilters` dentro de un Sheet lateral
  que se abre desde el topbar. Fetchea opciones disponibles vía
  `/api/filters/available`.
- **Full-width:** el `<main>` ocupa todo el ancho disponible. Las pages
  no renderizan su propio layout de filtros — heredan todo del AppShell.

## Lineamientos de diseño visual

> ⚠️ **v1.7 — tema "Plasmart Control Room" (dark-first).** El dashboard se
> rediseñó como el panel de control de una máquina de corte: **acero oscuro
> + acento plasma (naranja incandescente `#ff6a2c`)** + sistema de estado
> verde/ámbar/rojo + numerales monoespaciados. La **fuente de verdad** es
> `app/globals.css` (los valores de los tokens se remapearon a oscuro; el
> `<html>` lleva `class="dark"`). Tipografía: **IBM Plex Sans** (UI) +
> **IBM Plex Mono** (`.font-data`, para cifras/tablas). Series: Google Ads =
> cyan `#38bdf8`, Meta = violet `#a78bfa`. Superficies vía `surface-card`;
> stripe plasma vía `glow-stripe`; cards del cockpit en `components/cockpit/`.
> La descripción **slate + azul (light)** de abajo es **histórica** — los
> nombres de token siguen valiendo, pero ahora apuntan a valores oscuros.

Identidad basada en plasmartcba.com (industrial-elegante).
Paleta histórica (light, pre-v1.7): **slate + azul** con dos sistemas de tokens conviviendo:
- **shadcn** (HSL): `background/foreground/primary/secondary/muted/
  accent/border` + `sidebar-*`. Usado por componentes en `components/ui/`.
- **Plasmart legacy** (hex via aliases): `text-steel`, `text-light`,
  `bg-cream`, `border-default`, `border-soft`, `bg-brand`, `bg-brand-soft`,
  `text-success`, `text-warning`, `bg-gads`, `bg-meta`. Usado por
  componentes legacy en `components/*` (no `ui/`).

⚠️ **Importante**: "accent" en shadcn = hover neutro slate-100, NO color
brand. "brand" en Plasmart = blue-600 (lo que en versiones anteriores
del proyecto se llamaba "accent" — se renombró para no chocar).

**Paleta de colores (slate + blue):**
- Primary `#0f172a` (slate-900) — texto principal, headings, valores de KPI
- Accent `#2563eb` (blue-600) — links, focus rings, indicador de tab activa,
  stripe superior de KPI cards neutras, marca destacada en el logo
- Accent soft `#dbeafe` (blue-100) — fondo de chips de filtro activo,
  íconos del estado vacío
- Steel `#475569` (slate-600) — texto secundario, serie Google Ads
- Light `#64748b` (slate-500) — labels, metadatos, eyebrows. *Subido desde
  slate-400 (`#94a3b8`) en la auditoría UI/UX (jun-2026): el 400 daba ~2.6:1
  sobre fondo claro y fallaba WCAG AA. El 500 da ~4.8:1. Ver
  `docs/auditoria-ui-ux.md`.*
- Cream `#f8fafc` (slate-50) — fondo de página
- White `#ffffff` — fondo de cards
- Border `#e2e8f0` (slate-200) — bordes y divisores principales
- Border soft `#f1f5f9` (slate-100) — divisores internos de cards
- Success `#059669` (emerald-600) — métricas positivas y stripe favorable
- Warning `#d97706` (amber-600) — métricas a revisar y stripe desfavorable
- GAds series `#475569` — Google Ads en charts/listas
- Meta series `#2563eb` — Meta Ads en charts/listas

**Tipografía:** IBM Plex Sans (Google Fonts) + IBM Plex Mono para cifras
- Headings de página: IBM Plex Sans SemiBold sentence-case (`text-2xl`/`text-3xl`).
- Cifras de KPI y tablas: clase `.font-data` = IBM Plex Mono, `font-variant-numeric: tabular-nums`.
- Eyebrows: clases utilitarias `.eyebrow-xs` (10px) y `.eyebrow-sm` (11px),
  definidas en `app/globals.css`.
- Reservamos uppercase + tracking amplio para eyebrows y micro-labels, no para titulares.

**Iconografía:** `@remixicon/react` (RiArrowRightUpLine, RiCalendarLine,
RiFilter3Line, RiSparkling2Line, RiDownloadLine, RiRefreshLine,
RiLogoutBoxRLine). No mezclar con emojis ni con triángulos unicode. Los
componentes de producto (`components/*`, incluido `app-shell/`) usan sólo
remixicon — en la auditoría jun-2026 se migró el sidebar/topbar/hub que
todavía usaban `lucide-react`. La única excepción son los primitivos shadcn
(`components/ui/*`), que traen glifos internos de lucide (check, chevron, X)
y se dejan como vienen del vendor.

**Patrones de layout:**
- **KPI cards** llevan un stripe horizontal de 2px arriba (`bg-accent` por
  default, `bg-success` o `bg-warning` cuando el delta lo amerita).
- **Sparklines** dibujan área tenue + baseline punteada (promedio) + punto
  destacado en el último valor.
- **Filtros** se agrupan visualmente (Rango / Scope) con un divisor
  vertical en desktop. Los filtros de scope activos se muestran como
  chips abajo de la barra.
- **Tablas en mobile**: nunca scroll horizontal — se renderiza una lista
  de cards verticales con definition list por fila. El switch desktop/mobile
  vive dentro de cada componente, no en CSS global.

**Principios:**
- Sobriedad industrial. Sin gradientes ni decoraciones.
- Datos como protagonistas, chrome de UI invisible.
- Espacio en blanco generoso.
- Contraste alto, jerarquía clara: una sola "voz" por nivel (no abusar de
  uppercase + tracking en headings).

## Convenciones de código

- **Idioma del código:** inglés (variables, funciones, tipos, archivos)
- **Idioma del producto (UI, copy, comentarios):** español rioplatense
- **Idioma de commits:** español, imperativo, conciso
- **Estilo:** Prettier (config default) + ESLint
- **Imports:** path aliases con `@/` apuntando a la raíz
- **TypeScript:** strict mode siempre
- **Componentes:** Server Components por default, Client Components solo cuando se necesite interactividad

## Reglas de seguridad — IMPORTANTES

1. **NUNCA hardcodear credenciales.** Todas las keys/secrets viven en variables
   de entorno. El frontend solo accede a `NEXT_PUBLIC_*`.
2. **Service Role Key de Supabase NUNCA va al cliente.** Solo en Server
   Components, API routes, o Edge Functions.
3. **Anthropic API Key NUNCA va al cliente.** Las llamadas a Claude se hacen
   desde Edge Functions o API routes.
4. **Toda tabla tiene RLS habilitado.** Las políticas iniciales permiten lectura
   a usuarios autenticados con email `@transfil.com.ar`.
5. **No commitear archivos `.env.local`** ni ningún archivo con credenciales reales.
   Verificar siempre antes de commitear.

## Plan por fases

El desarrollo está organizado en 7 fases. Resumen:

- **Fase 0 (✅ completa):** Preparación de cuentas e infra (GitHub, Supabase, Vercel, Anthropic, Google)
- **Fase 1 (✅ completa):** Configuración de fuentes de datos en Drive (extractores Apps Script + Ads Scripts)
- **Fase 2 (✅ completa):** Modelo de datos y Edge Function de ingesta (incluyendo adsets/ads v1.4)
- **Fase 3 (✅ completa):** Frontend base, layout, autenticación
- **Fase 4 (✅ completa):** Dashboard de KPIs, filtros, gráficos
- **Fase 5 (✅ completa):** Motor de análisis con Claude (cache, prompt, Corey Haines)
- **Fase 6 (en curso):** Refinamientos — rediseño Control Room v1.7, auditoría UX, granularidad v1.6
- **Fase 7:** Lanzamiento formal

**Regla:** no avanzar de fase si los criterios de aceptación de la actual
no están cumplidos.

## Features pospuestas

Cosas que ya se intentaron o se evaluaron y quedan para una fase posterior.
No retomarlas hasta que el dashboard esté estable y el equipo lo pida.

- **Reporte semanal por mail (Resend + pg_cron).** Se prototipó en PR #8
  (mergeada y revertida en PR #9): endpoint `/api/cron/weekly-report` con
  auth por shared secret, HTML con KPIs + análisis de Claude + dos
  charts SVG inline, disparado por `pg_cron` los lunes 18:30 ART. Se
  abandonó por dos razones:
  1. El setup operativo (verificar dominio en Resend, configurar 4 envs
     en Vercel, crear 2 secrets en Supabase Vault, aplicar la migration
     del cron) tiene fricción alta para algo que el equipo todavía no
     pidió.
  2. Mientras el dashboard se itera todas las semanas, un mail con
     análisis viejo en la bandeja de entrada genera ruido más que valor.
  Para retomar: revisar el branch `claude/add-tremor-ui-1Eeb7` antes
  del revert (commit `0b7d224`) — el código andaba.

## Cómo trabajamos

- Las decisiones de arquitectura, diseño y dudas conceptuales se discuten
  con Claude en chat web (claude.ai) antes de implementar.
- La implementación concreta (escribir código, archivos, comandos) se hace
  con Claude Code aquí.
- Cada cambio significativo va a su propio commit con mensaje descriptivo en español.

## Skills de Claude Code instalados

En `.claude/skills/` viven skills versionadas con el repo. Las relevantes
para diseño:

- **`ui-ux-pro-max`** — motor de inteligencia de diseño (67 estilos, 161
  paletas, 99 guías UX, 25 tipos de chart). Se usa para auditar y diseñar
  UI. Tiene un CLI Python:
  ```bash
  # Sistema de diseño recomendado para un tipo de producto
  python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
    "internal analytics dashboard b2b data-dense" --design-system
  # Búsqueda por dominio (ux / color / chart / typography / style / product)
  python3 .claude/skills/ui-ux-pro-max/scripts/search.py "loading accessibility" --domain ux
  ```
  La auditoría completa del sitio con este skill está en
  `docs/auditoria-ui-ux.md`.
- Colección **`intellectronica/agent-skills`** (beautiful-mermaid, promptify,
  markdown-converter, ultrathink, etc.) — utilidades varias, la mayoría
  integraciones con APIs externas que necesitan su propia key.
