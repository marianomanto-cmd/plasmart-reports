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
- **fact_campaign_daily** — hechos diarios (date, campaign_id, impressions, clicks, conversions, cost_ars, revenue_ars)
- **fact_ga_daily** — datos diarios de Google Analytics 4
- **ai_analysis_cache** — cache de respuestas de Claude por hash de filtros
- **ingestion_log** — log de cada ejecución del ingest

Vistas materializadas:
- **mv_campaign_weekly** — agregados semanales
- **mv_campaign_monthly** — agregados mensuales
- **mv_publisher_summary** — totales por publisher

**Importante:** la moneda es siempre ARS (Plasmart factura GAds en pesos).

## Lineamientos de diseño visual

Identidad basada en plasmartcba.com (industrial-elegante).

**Paleta de colores:**
- Primary (negro): `#1A1A1A` — texto principal, headings
- Accent (cobre): `#C9A961` — acento sutil
- Steel: `#4A4A4A` — texto secundario
- Light: `#8A8A8A` — labels, metadatos
- Background light: `#F5F5F0` — fondos de bloques (cremoso, no blanco puro)
- Border: `#D0D0D0` — divisores
- Success: `#5C8A5C` — métricas positivas
- Warning: `#B8704A` — métricas a revisar
- White: `#FFFFFF` — fondo de cards

**Tipografía:** Inter (Google Fonts)
- Headings: Inter Bold, mayúsculas, tracking +2%
- Texto: Inter Regular 14-16px
- Cifras de KPI: Inter Bold 32-48px, sin abreviar (mostrar 1.234.567 antes que 1.2M)

**Principios:**
- Sobriedad industrial. Sin gradientes ni decoraciones.
- Datos como protagonistas, chrome de UI invisible.
- Espacio en blanco generoso.
- Contraste alto (negro sobre claro, sin grises desvaídos).

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
