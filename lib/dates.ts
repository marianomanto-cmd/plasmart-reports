// Utilidades de fechas para el dashboard.
// Toda la aritmética la hacemos en UTC: serializamos a "YYYY-MM-DD" sin
// que la zona horaria del cliente afecte el resultado.

import type { CompareMode } from "@/lib/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parsea "YYYY-MM-DD" como medianoche UTC. */
export function parseIsoDate(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function isValidIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  // El formato es válido; ahora exigimos que la fecha del calendario sea
  // real. `new Date("2026-02-30…")` no devuelve NaN: V8 normaliza al
  // 2-mar. Sin este round-trip, un `?from=2026-02-30` en la URL se
  // aceptaría y se interpretaría como otro día sin avisar.
  const d = parseIsoDate(s);
  return !Number.isNaN(d.getTime()) && toIsoDate(d) === s;
}

/** Hoy a medianoche UTC, serializado a "YYYY-MM-DD". */
export function todayIso(): string {
  const now = new Date();
  return toIsoDate(
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ),
  );
}

/** Rango por defecto: últimos 30 días incluyendo hoy. */
export function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const from = new Date(to.getTime() - 29 * MS_PER_DAY);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

/** Largo del rango en días (inclusive ambos extremos). */
export function rangeDays(from: string, to: string): number {
  return (
    Math.round(
      (parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / MS_PER_DAY,
    ) + 1
  );
}

/**
 * Devuelve el rango contra el cual comparar el período actual.
 *
 *   previous → mismo largo inmediatamente anterior.
 *              Ej: 2026-04-01..2026-04-30 → 2026-03-02..2026-03-31
 *
 *   yoy      → mismo rango exacto del año pasado.
 *              Ej: 2026-04-01..2026-04-30 → 2025-04-01..2025-04-30
 *              Para febrero, si el rango actual incluye 29-feb de un
 *              año bisiesto y el año anterior no lo es, JavaScript
 *              normaliza el día (29-feb-2025 → 1-mar-2025). Es
 *              aceptable para nuestro caso de uso.
 *
 *   none     → null. La capa de queries no hace la segunda llamada.
 */
export function comparisonRange(
  from: string,
  to: string,
  mode: CompareMode,
): { from: string; to: string } | null {
  if (mode === "none") return null;

  const f = parseIsoDate(from);
  const t = parseIsoDate(to);

  if (mode === "previous") {
    const days = rangeDays(from, to);
    const prevTo = new Date(f.getTime() - MS_PER_DAY);
    const prevFrom = new Date(prevTo.getTime() - (days - 1) * MS_PER_DAY);
    return { from: toIsoDate(prevFrom), to: toIsoDate(prevTo) };
  }

  // mode === "yoy"
  const prevFrom = new Date(
    Date.UTC(f.getUTCFullYear() - 1, f.getUTCMonth(), f.getUTCDate()),
  );
  const prevTo = new Date(
    Date.UTC(t.getUTCFullYear() - 1, t.getUTCMonth(), t.getUTCDate()),
  );
  return { from: toIsoDate(prevFrom), to: toIsoDate(prevTo) };
}

/** Etiqueta humana corta para mostrar arriba del dashboard. */
export function compareModeLabel(mode: CompareMode): string {
  switch (mode) {
    case "previous":
      return "período anterior";
    case "yoy":
      return "año anterior";
    case "none":
      return "sin comparación";
  }
}

// ---------- Presets de rango de fechas ----------
// Atajos de un clic para los rangos que la gerencia mira siempre.
// Cada preset calcula {from, to} relativos a "hoy" (UTC), así que el
// rango se mantiene fresco sin tener que tocar las fechas a mano.

export type DateRangePresetKey =
  | "today"
  | "last7"
  | "last14"
  | "last30"
  | "last90"
  | "thisMonth"
  | "lastMonth"
  | "thisYear";

export interface DateRangePreset {
  key: DateRangePresetKey;
  label: string;
  /** Calcula el rango {from, to} relativo a hoy. */
  range(): { from: string; to: string };
}

/** Últimos N días incluyendo hoy (to = hoy, from = hoy - (N-1)). */
function lastNDays(n: number): { from: string; to: string } {
  const to = todayIso();
  const from = toIsoDate(
    new Date(parseIsoDate(to).getTime() - (n - 1) * MS_PER_DAY),
  );
  return { from, to };
}

export const DATE_RANGE_PRESETS: ReadonlyArray<DateRangePreset> = [
  {
    key: "today",
    label: "Hoy",
    range: () => ({ from: todayIso(), to: todayIso() }),
  },
  { key: "last7", label: "Últimos 7 días", range: () => lastNDays(7) },
  { key: "last14", label: "Últimos 14 días", range: () => lastNDays(14) },
  { key: "last30", label: "Últimos 30 días", range: () => lastNDays(30) },
  { key: "last90", label: "Últimos 90 días", range: () => lastNDays(90) },
  {
    key: "thisMonth",
    label: "Este mes",
    range: () => {
      const now = new Date();
      return {
        from: toIsoDate(
          new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        ),
        to: todayIso(),
      };
    },
  },
  {
    key: "lastMonth",
    label: "Mes pasado",
    range: () => {
      const now = new Date();
      return {
        // primer día del mes anterior … último día del mes anterior
        from: toIsoDate(
          new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
        ),
        to: toIsoDate(
          new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)),
        ),
      };
    },
  },
  {
    key: "thisYear",
    label: "Este año",
    range: () => {
      const now = new Date();
      return {
        from: toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))),
        to: todayIso(),
      };
    },
  },
];

/**
 * Devuelve la key del preset que matchea exactamente el rango actual,
 * o null si es un rango custom. Sirve para resaltar el preset activo.
 */
export function matchDatePreset(
  from: string,
  to: string,
): DateRangePresetKey | null {
  for (const preset of DATE_RANGE_PRESETS) {
    const r = preset.range();
    if (r.from === from && r.to === to) return preset.key;
  }
  return null;
}
