# Auditoría UI/UX — Plasmart Reports

**Fecha:** junio 2026
**Herramienta:** skill [`ui-ux-pro-max`](../.claude/skills/ui-ux-pro-max) (NextLevelBuilder)
+ checklist de accesibilidad WCAG.
**Alcance:** todo el dashboard (`app/` + `components/`), foco en las vistas
`/dashboard`, `/dashboard/paid`, `/dashboard/analysis`, `/dashboard/traffic`,
`/admin` y los componentes compartidos (KPI cards, tablas, charts, filtros,
app-shell).

> Este documento es el entregable de la auditoría. Registra qué se revisó,
> qué se corrigió en esta pasada y qué queda recomendado para más adelante.

---

## Metodología

El skill `ui-ux-pro-max` ordena las reglas de diseño en 10 categorías por
prioridad de impacto. Se revisó el código contra cada categoría y se generó
el sistema de diseño recomendado para este tipo de producto:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "internal analytics dashboard b2b admin data-dense" --design-system
```

**Resultado del skill** (resumen): patrón *Real-Time / Operations*, estilo
**Data-Dense Dashboard** (light + dark, performance excelente, WCAG AA),
paleta azul + ámbar, tipografía orientada a datos. **El sitio ya está muy
alineado** con esa recomendación: slate + blue, cards densas, tabular-nums,
sin gradientes ni decoración. La auditoría confirma que la base es sólida;
las mejoras son de pulido, sobre todo de **accesibilidad** (prioridad #1 del
skill), que es donde había deuda real.

Leyenda de estado:
- ✅ **Corregido** en esta pasada.
- ✔️ **Ya estaba OK** (se verificó, no requería cambio).
- ⚠️ **Pendiente** (recomendado, no se tocó todavía).

---

## Hallazgos por prioridad

### 1. Accesibilidad — CRÍTICO

| Hallazgo | Estado | Detalle |
|---|---|---|
| **Contraste de `text-light` insuficiente** | ✅ | El token `--color-plasmart-light` era slate-400 (`#94a3b8`) → ~2.6:1 sobre fondo claro. Falla WCAG AA (4.5:1) e incluso AA-large (3:1). Se usa en eyebrows, labels, metadatos y **texto informativo real** ("Sin datos en el rango", helper text de los textareas, contadores). Subido a slate-500 (`#64748b`) → ~4.8:1. Un solo cambio de token arregla toda la app. |
| **Focus rings ausentes/débiles en controles** | ✅ | Botones de orden (`<th>`) de las tablas y toggle de dirección mobile no tenían foco visible. Selects de orden y textareas usaban `focus:outline-none` sin reemplazo (sólo cambio de borde). Se agregó `focus-visible:ring-2 ring-brand/40` a los botones y `focus:ring-2 ring-brand/20` a selects/textareas (`campaign/adset/ad-table`, `ai-analysis`, `analysis-context-modal`, `empty-state-banner`). |
| `aria-current` en navegación | ✔️ | El sidebar ya marca la ruta activa con `aria-current="page"`. |
| `aria-label` en botones icon-only | ✔️ | Hamburger, menú de usuario y botón de cerrar chip ya tienen label. |
| Jerarquía de headings | ✔️ | Las pages usan `h2`/`h3` con `sr-only` donde el título es visualmente implícito (ej. chart de evolución). |
| `html lang` | ✔️ | `lang="es-AR"` en el root layout. |
| `prefers-reduced-motion` | ✅ | No se respetaba. Se agregó un bloque global en `globals.css` que neutraliza transiciones/animaciones (incluye los hover de tablas y la animación de entrada de los charts Recharts/Tremor). |

### 2. Touch & Interacción — CRÍTICO

| Hallazgo | Estado | Detalle |
|---|---|---|
| `cursor-pointer` en clickables | ✔️ | Botones nativos y links ya lo traen; el item de logout lo fuerza explícito. |
| Feedback de hover en filas/botones | ✔️ | Filas de tabla con `hover:bg-cream/50`, botones con transición de color. |
| Tamaño de tap del botón "x" de los chips de filtro | ⚠️ | El área es < 44px (`p-0.5` sobre un ícono de 12px). Es una concesión consciente al diseño compacto. Si se prioriza touch, expandir con `hitSlop`/padding o `before:` invisible. |

### 3. Performance — ALTO

| Hallazgo | Estado | Detalle |
|---|---|---|
| Fuentes con `display: swap` | ✔️ | Inter via `next/font` con `display: "swap"`. |
| Skeletons en carga | ✔️ | `InlineFilters` y `dashboard/loading.tsx` muestran skeletons. |
| Charts client-side / code-split | ✔️ | Charts Tremor son `"use client"` y se montan sólo en las vistas que los usan. |
| Virtualización de listas largas | ⚠️ | Las tablas renderizan todas las filas. Con el volumen esperado (20-50 campañas) no hace falta; revisar si granularidad `ad` trae cientos de filas. |

### 4. Selección de estilo — ALTO

| Hallazgo | Estado | Detalle |
|---|---|---|
| **Dos familias de íconos mezcladas** | ✅ | `app-shell` (sidebar/topbar), `analysis-hub` y `dashboard/page` usaban `lucide-react`; el resto del producto usa `@remixicon/react` (convención documentada en CLAUDE.md). Se migraron a remixicon (`RiDashboardLine`, `RiLineChartLine`, `RiGlobalLine`, `RiSparkling2Line`, `RiSettings3Line`, `RiArrowRightSLine`, `RiMenuLine`, `RiLogoutBoxRLine`, `RiFlashlightLine`). Lucide queda sólo en los primitivos shadcn (`components/ui/*`), que lo traen de fábrica. |
| Sin emojis como íconos | ✔️ | No se encontraron emojis estructurales. |
| Consistencia de estilo entre pages | ✔️ | Mismo lenguaje visual (cards, stripes, eyebrows) en todas las vistas. |
| Escala de elevación/sombra consistente | ✔️ | Cards con borde + sombra sutil uniforme; sin sombras random. |

### 5. Layout & Responsive — ALTO

| Hallazgo | Estado | Detalle |
|---|---|---|
| Sin scroll horizontal en mobile | ✔️ | Las tablas conmutan a lista de cards verticales (`sm:hidden`), no hay scroll-x. `overflow-x-hidden` global de respaldo. |
| `min-h-dvh` sobre `100vh` | ✔️ | El app-shell usa `min-h-dvh`. |
| Breakpoints sistemáticos | ✔️ | `sm/md/lg` consistentes; grids de filtros y KPIs responsivos. |
| Ancho de contenido contenido | ✔️ | `max-w-7xl` centrado en las pages. |

### 6. Tipografía & Color — MEDIO

| Hallazgo | Estado | Detalle |
|---|---|---|
| Tokens de color semánticos | ✔️ | Dos sistemas (shadcn HSL + Plasmart legacy) bien documentados; sin hex crudo en componentes salvo casos puntuales de chart. |
| `tabular-nums` en columnas de datos | ✔️ | KPIs, tablas y sparklines usan `tabular-nums`. |
| Jerarquía por peso/tamaño, no sólo color | ✔️ | Eyebrows + valores bold + secundarios en steel. |
| Contraste de `text-light` | ✅ | Ver categoría #1 (mismo fix de token). |

### 7. Animación — MEDIO

| Hallazgo | Estado | Detalle |
|---|---|---|
| Duraciones 150–300ms | ✔️ | Transiciones de color/hover en ese rango. |
| `prefers-reduced-motion` | ✅ | Agregado (ver #1). |
| Sólo `transform`/`opacity` | ✔️ | No se animan width/height. |

### 8. Forms & Feedback — MEDIO

| Hallazgo | Estado | Detalle |
|---|---|---|
| Labels visibles por input | ✔️ | `FiltersBar` y textareas con label/`htmlFor`. |
| Estado de carga en submit | ✔️ | `isPending` en filtros ("Actualizando…"), spinners en análisis IA. |
| Empty states con guía | ✔️ | `EmptyStateBanner` y empties por componente con CTA/explicación. |
| Foco visible en textareas | ✅ | Ver #1. |

### 9. Navegación — ALTO

| Hallazgo | Estado | Detalle |
|---|---|---|
| Estado activo visible | ✔️ | Sidebar resalta la ruta y sub-ruta activas. |
| Preserva estado al navegar | ✔️ | Los links del sidebar arrastran los query params (filtros). |
| Sidebar (desktop) + drawer (mobile) | ✔️ | Patrón adaptativo correcto; no mezcla bottom-nav + sidebar. |
| Acción destructiva separada | ✔️ | "Cerrar sesión" vive en el menú de usuario, separado de la nav. |
| Deep-linking de filtros | ✔️ | Todo el estado de filtros vive en la URL (compartible). |

### 10. Charts & Datos — BAJO

| Hallazgo | Estado | Detalle |
|---|---|---|
| **Resumen para lector de pantalla** | ✅ | El chart de evolución (`cost-evolution`) es un SVG `aria-hidden` de hecho. Se agregó un `<p class="sr-only">` con el resumen (totales por publisher + cantidad de días). |
| Tooltips on hover | ✔️ | Tremor AreaChart/BarChart con tooltips de valor exacto. |
| Tipo de chart según dato | ✔️ | Línea/área para tendencia, barras para comparación, en línea con el skill. |
| Empty state del chart | ✔️ | Cada chart tiene su empty ("Sin datos en el rango"). |
| Color no es el único diferenciador | ⚠️ | Series gads/meta se distinguen por color + leyenda con totales; un patrón/trama agregaría redundancia para daltonismo. Mejora menor pendiente. |
| Tabla sortable con `aria-sort` | ⚠️ | Las tablas ordenan por columna pero no exponen `aria-sort` en los `<th>`. Mejora de a11y pendiente. |

---

## Cambios aplicados en esta pasada

1. **Contraste (token global):** `--color-plasmart-light` slate-400 → slate-500
   en `app/globals.css`. Cumple WCAG AA en toda la app de un saque.
2. **`prefers-reduced-motion`:** regla global en `app/globals.css`.
3. **Focus rings:** agregados en los controles que no tenían foco visible —
   `campaign-table`, `adset-table`, `ad-table` (botones de orden, selects y
   toggle de dirección), `ai-analysis`, `analysis-context-modal` (textareas) y
   `empty-state-banner` (link).
4. **Consistencia de íconos:** migración `lucide-react` → `@remixicon/react` en
   `app-shell/sidebar-nav`, `app-shell/topbar`, `analysis-hub` y
   `dashboard/page`.
5. **Accesibilidad de chart:** resumen `sr-only` en `charts/cost-evolution`.
6. **Docs:** actualizado `CLAUDE.md` (paleta + iconografía + skills) y creado
   este informe.

Verificación: `npm run type-check` pasa sin errores.

---

## Pendientes recomendados (no bloqueantes)

Ordenados por relación impacto/esfuerzo:

1. **`aria-sort` en los `<th>` de las tablas** — refleja el orden activo para
   lectores de pantalla. Bajo esfuerzo.
2. **Área de tap del botón "x" de los chips** ≥ 44px — sólo si se prioriza
   uso táctil.
3. **Trama/patrón en las series de chart** además del color — para daltonismo.
4. **Virtualización** de la tabla de `ad` si una cuenta trae cientos de ads.
5. **Auditar contraste del modo de los charts Tremor** si en el futuro se
   activa dark mode (hoy el proyecto es light-only).

---

## Cómo re-correr la auditoría

```bash
# Sistema de diseño recomendado
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "internal analytics dashboard b2b data-dense" --design-system

# Reglas UX puntuales (accesibilidad, loading, animación…)
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "accessibility focus loading animation" --domain ux -n 10

# Recomendación de chart para un dato
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "trend over time comparison" --domain chart
```
