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
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind + Tremor |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Hosting | Vercel (plan Hobby) |
| IA | Claude API (modelo a definir en Fase 5) |
| Auth | Supabase Auth con Google OAuth, dominio @transfil.com.ar |

## Estructura del proyecto
```

app/ # Next.js App Router (auth)/ # Rutas públicas (login) (dashboard)/ # Rutas autenticadas api/ # API routes (server-side) components/ # React components ui/ # Componentes base charts/ # Visualizaciones filters/ # Barra de filtros lib/ supabase/ # Cliente Supabase (server + client) anthropic/ # Cliente y prompts de Claude utils/ # Helpers supabase/ migrations/ # Migrations Postgres versionadas functions/ # Edge Functions ingest-reports/ # Lee Sheets de Drive y popula la DB analyze-snapshot/ # Llama a Claude para análisis public/ # Assets estáticos

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

### Granularidad de análisis (v1.4)

El reporte "Corey Haines" (`/dashboard/corey-haines`) y la vista
"Detalle" (`/dashboard/detalle`) aceptan tres niveles via selector
en la UI:
- `campaign` (default): comportamiento histórico, todos los publishers.
- `adset`: agrega `top adsets` al payload de Claude. Solo Google Ads — si
  el filtro publisher no es `gads`, el server fuerza `campaign`.
- `ad`: agrega `top ads`. Mismas reglas que adset.

En `/detalle` la granularidad se persiste en la URL (`?granularity=adset`)
para que el link sea compartible y el back del browser recupere el estado.
En Corey Haines es estado local del componente.

Si las tablas `fact_adset_daily` / `fact_ad_daily` están vacías para el
período (porque la ingesta de adsets/ads no está configurada todavía), el
payload manda `drill_down.has_data = false` y el prompt le dice a Claude
que aclare la falta y caiga a nivel campaña.

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

### Refactor del ingest (v1.4.1)

Las funciones `ingestAdsets(supabase, publisher, ...)` e
`ingestAds(supabase, publisher, ...)` son agnósticas al publisher: la
única diferencia entre gads y meta a este nivel es el `.eq("publisher", ...)`
al resolver `campaign_id`. Por eso un mismo helper sirve para las cuatro
fuentes opcionales (gads/meta × adset/ad).

## Estructura de rutas (v1.5)

| Ruta | Contenido | Sidebar item |
|---|---|---|
| `/dashboard` | Overview: KPIs paid + GA4, chart evolución, CTA al análisis | Overview |
| `/dashboard/paid` | Comparativa GAds vs Meta + selector granularidad + top + tabla | Paid |
| `/dashboard/paid/gads` | Idem, publisher forzado a gads | ↳ Google Ads |
| `/dashboard/paid/meta` | Idem, publisher forzado a meta | ↳ Meta Ads |
| `/dashboard/traffic` | GA4: KPIs + tabla source/medium | Tráfico |
| `/dashboard/analysis` | Hub IA con toggle rápido / experto (Corey Haines) | Análisis |
| `/admin` | Log de ingestas, freshness, log de IA | Admin |

Rutas legacy (`/dashboard/comparativa`, `/dashboard/detalle`,
`/dashboard/corey-haines`) **redirigen** preservando los search params, no
se borran de un saque para no romper bookmarks ni linkeos previos.

## AppShell (v1.5)

Layout principal en `components/app-shell/`:

- **Sidebar** fija a la izquierda en desktop (≥md), oculta en mobile
  (accesible vía hamburger en el topbar que abre un Sheet de shadcn).
  Items: Overview / Paid (con sub-items GAds y Meta) / Tráfico /
  Análisis, más Admin separado abajo. Preserva query params al navegar.
- **Topbar** persistente con marca (mobile), chip de período activo
  (desktop), botón Filtros que abre drawer lateral, menu de usuario.
- **Filtros en drawer**: la `FiltersBar` ya no vive sticky en cada
  página. Va en un Sheet lateral que se abre desde el topbar. Auto-
  fetchea los `available filters` via `/api/filters/available` (cliente).
- Las pages bajo `/dashboard/*` y `/admin/*` no renderizan más su propio
  `<main>` ni filtros inline — heredan todo del AppShell.

## Lineamientos de diseño visual

Identidad basada en plasmartcba.com (industrial-elegante).
Paleta efectiva: **slate + azul** con dos sistemas de tokens conviviendo:
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
- Light `#94a3b8` (slate-400) — labels, metadatos, eyebrows
- Cream `#f8fafc` (slate-50) — fondo de página
- White `#ffffff` — fondo de cards
- Border `#e2e8f0` (slate-200) — bordes y divisores principales
- Border soft `#f1f5f9` (slate-100) — divisores internos de cards
- Success `#059669` (emerald-600) — métricas positivas y stripe favorable
- Warning `#d97706` (amber-600) — métricas a revisar y stripe desfavorable
- GAds series `#475569` — Google Ads en charts/listas
- Meta series `#2563eb` — Meta Ads en charts/listas

**Tipografía:** Inter (Google Fonts)
- Headings de página: Inter Bold sentence-case (`text-2xl`/`text-3xl`),
  tracking ajustado. Reservamos uppercase + tracking amplio para eyebrows
  y micro-labels, no para titulares.
- Eyebrows: clases utilitarias `.eyebrow-xs` (10px) y `.eyebrow-sm` (11px),
  definidas en `app/globals.css`.
- Cifras de KPI: Inter Bold 32-48px, sin abreviar.

**Iconografía:** `@remixicon/react` (RiArrowRightUpLine, RiCalendarLine,
RiFilter3Line, RiSparkling2Line, RiDownloadLine, RiRefreshLine,
RiLogoutBoxRLine). No mezclar con emojis ni con triángulos unicode.

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
- **Fase 1 (en curso):** Configuración de fuentes de datos en Drive
- **Fase 2:** Modelo de datos y Edge Function de ingesta
- **Fase 3:** Frontend base, layout, autenticación
- **Fase 4:** Dashboard de KPIs, filtros, gráficos
- **Fase 5:** Motor de análisis con Claude
- **Fase 6:** Refinamientos y monitoreo
- **Fase 7:** Lanzamiento

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
