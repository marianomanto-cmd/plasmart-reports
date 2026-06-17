# Changelog

Cambios notables del proyecto. Formato basado en
[Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

## [No publicado]

### Agregado

- **Suite de tests unitarios (Vitest).** 67 tests sobre la lógica pura del
  dashboard: `lib/dates`, `lib/filters`, `lib/format`, `lib/insights` y
  `lib/ai/hash`. Antes no había ninguna cobertura automatizada.
  Scripts: `npm run test`, `test:watch`, `test:coverage`, `validate`.
- **Integración continua (GitHub Actions).** `.github/workflows/ci.yml`
  corre type-check + lint + test + build en cada push a `main` y cada PR.
- **Cabeceras de seguridad** en `next.config.ts`: `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Strict-Transport-Security`,
  `Permissions-Policy` y `X-DNS-Prefetch-Control`. Además
  `poweredByHeader: false`.
- **Filtro de fechas con presets de un clic** (Hoy / Últimos 7-14-30-90 días
  / Este mes / Mes pasado / Este año) reemplazando el slider de días, con
  fechas exactas en modo oscuro y resumen en vivo del rango.
- `robots: noindex` y `theme-color` en el metadata raíz (la herramienta es
  interna y no debe indexarse).
- `.nvmrc` (Node 20) para fijar la versión de runtime.

### Corregido

- **`isValidIsoDate` aceptaba fechas de calendario imposibles.** Un
  `?from=2026-02-30` en la URL pasaba la validación porque `new Date()`
  normaliza silenciosamente al 2-mar. Ahora se exige round-trip
  (`toIsoDate(parseIsoDate(s)) === s`), así fechas como 30-feb o 31-abr se
  rechazan y caen al rango por defecto. (Detectado por la nueva suite.)
- **`npm run lint` estaba roto.** Next 16 removió el comando `next lint`;
  se migró a ESLint 9 con flat config (`eslint.config.mjs`) usando el flat
  config nativo de `eslint-config-next@16`.
- Errores de lint reales en código propio: variables reasignadas dentro del
  `.map` de render en `cost-evolution.tsx` (rompía la regla del React
  Compiler) y comillas sin escapar en `corey-haines-analysis.tsx`.

### Cambiado

- El chip de período del topbar muestra el nombre del preset activo
  (ej. "Últimos 30 días") en lugar de las fechas crudas cuando aplica.
- Reglas de ESLint relajadas sólo para el código vendoreado de Tremor
  (`components/tremor/**`, `lib/tremor/**`), que no se reescribe por estilo.
