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
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(parseIsoDate(s).getTime())
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
