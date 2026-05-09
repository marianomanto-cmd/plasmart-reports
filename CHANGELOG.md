# Changelog

Cambios relevantes del proyecto. Formato libre, en orden cronológico inverso
(lo más nuevo arriba). Cada entrada es un bloque de trabajo, no un commit.

## 2026-05-09 — Refactor visual y reorganización de componentes

Pase de prolijidad sobre la UI ya implementada. Sin cambios funcionales.

### Estética

- **Login migrado a tokens.** La página de login usaba hex hardcodeados
  (`bg-[#f5f5f0]`, `text-[#1a1a1a]`, etc.) en lugar de los tokens definidos en
  `globals.css`. Ahora usa `bg-background`, `text-primary`, `bg-accent`,
  `border-warning` — un cambio futuro de paleta se propaga solo.
- **Tracking normalizado a 4 valores.** El proyecto tenía 7 valores distintos
  de `letter-spacing` (`0.1`, `0.12`, `0.15`, `0.18`, `0.2`, `0.22`, `0.28em`).
  Reducido a:
  - `0.12em` — pills, timestamps tabulares
  - `0.15em` — wordmark de marca
  - `0.18em` — micro-labels (botones, nav, status)
  - `0.22em` — eyebrows de sección y de página
- **Header del dashboard alineado al login.** Aplica el mismo tratamiento del
  login (`PLASMART` + línea cobre + sublabel "Reportería"). El wordmark ahora
  es link a `/dashboard`.
- **Header + tabs como un solo bloque.** Antes: header blanco → tabs crema →
  contenido crema (tres tonos apilados). Ahora: header y tabs comparten
  `bg-white`, separados solo por el border-bottom del header; el contenido
  sigue en crema.
- **Bloque "Análisis de Claude" con borde más sutil.** Bajado de
  `border-t-4 border-primary` (4px negro grueso, fuera de escala con el resto
  de la UI) a `border` 1px + `border-t-2 border-t-accent` (franja cobre 2px).
  Coherente con los bordes 1px de los demás cards.
- **KPI cards con altura estable.** El sparkline se renderiza dentro de un
  contenedor de altura fija (`h-6`). Antes, si una serie estaba vacía, la
  card era más baja que las demás y el grid tenía jitter.

### Organización

- **Reorganización de `components/`** — antes, 16 componentes en un único
  directorio plano. Ahora agrupados por dominio:

  ```
  components/
    ui/        kpi-card, sparkline, empty-state-banner, form-field
    layout/    dashboard-header, dashboard-tabs
    filters/   filters-bar
    dashboard/ kpi-grid, ga4-kpi-grid, ga4-source-medium-table,
               publisher-comparison, campaign-table
    ai/        ai-analysis, ai-analysis-log-table
    admin/     ingestion-log-table, force-ingest-button, data-freshness-panel
    charts/    cost-evolution, top-campaigns
  ```

  Movidos con `git mv` para preservar historial.

- **Form primitives extraídos.** `FieldLabel`, `DateField` y `SelectField`
  vivían inline dentro de `filters-bar.tsx` (345 líneas). Movidos a
  `components/ui/form-field.tsx` para reutilizar desde otras pantallas.

- **Error boundary del dashboard.** Nuevo `app/dashboard/error.tsx` para que
  un fallo en `Promise.all` de las 5 queries paralelas no rompa la página
  con un crash, sino que muestre un card con CTA "Reintentar" y un acceso
  rápido a `/admin` para revisar ingestas. Mismo lenguaje visual que
  `EmptyStateBanner`.

### Verificación

- `npm run type-check` — pasa.
- `npm run build` — compila las 12 rutas sin warnings.
- Sin cambios en lógica de queries, RLS, RPCs ni edge functions.

### Archivos tocados

- Creados: `app/dashboard/error.tsx`, `components/ui/form-field.tsx`,
  `CHANGELOG.md`.
- Renombrados: 16 componentes a sus nuevos paths bajo `components/<dominio>/`.
- Modificados: las 4 páginas (`login`, `dashboard`, `dashboard/comparativa`,
  `dashboard/detalle`, `admin`) y los layouts/componentes afectados por
  imports y los ajustes visuales.
