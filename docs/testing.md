# Testing

El proyecto usa [Vitest](https://vitest.dev/) para tests unitarios de la
**lógica pura** del dashboard. La estrategia es deliberadamente acotada:
testeamos las funciones deterministas que concentran el riesgo de bugs
(aritmética de fechas, parseo de filtros, formateo, derivación de insights,
hashing de cache) y dejamos fuera lo que requeriría un runtime de browser
o llamadas de red.

## Correr los tests

```bash
npm run test            # corrida única (lo que usa CI)
npm run test:watch      # modo watch durante desarrollo
npm run test:coverage   # reporte de cobertura de lib/**
```

## Qué se testea

| Archivo | Cubre |
|---|---|
| `tests/dates.test.ts` | ISO parse/serialize, validación de calendario, `defaultRange`, `rangeDays`, `comparisonRange` (previous/yoy/none), presets y `matchDatePreset`. |
| `tests/filters.test.ts` | `parseFilters` (defaults, valores inválidos, `from > to`, sanitización de `type`/`campaign`) y `buildSearchString` (round-trip, omisión de defaults). |
| `tests/format.test.ts` | Formateadores es-AR: enteros, moneda ARS, decimales, porcentajes y deltas. |
| `tests/insights.test.ts` | `buildAlerts` (orden por severidad e inversión, límite), `buildSpendDistribution`, `buildFunnel`, `buildEfficiencyPoints`. |
| `tests/hash.test.ts` | `hashFilters`: determinismo, sensibilidad a cada filtro, namespaces y `contextKey`. |

## Convenciones

- **Reloj congelado.** Los tests que dependen de "hoy" usan
  `vi.setSystemTime()` con una fecha fija (17-jun-2026) para ser
  deterministas. Siempre trabajamos en UTC, igual que `lib/dates`.
- **Sin globals.** Importamos `describe/it/expect` explícitamente desde
  `vitest`, así `tsc --noEmit` no necesita tipos globales extra.
- **Aserciones de formato robustas.** `Intl` mete espacios no-rompibles
  (NBSP) entre el símbolo de moneda y el número; los tests los normalizan
  para no romperse según la versión de ICU del runtime.

## Por qué no hay tests de componentes (todavía)

Los Server Components del dashboard hacen `await` de RPCs de Supabase y se
renderizan server-side; testearlos requeriría mockear la capa de datos
entera con poco retorno. Si en el futuro se agregan, el candidato natural
es testing-library + un entorno `jsdom` para los Client Components con
interacción (la `FiltersBar`, los modales).
