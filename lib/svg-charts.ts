// Helpers para los gráficos SVG del dashboard.
// Pura matemática y formato. Sin React, sin DOM.

import { parseIsoDate, toIsoDate } from "@/lib/dates";

// ---- Geometría: padding interno de los gráficos ----

export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_LINE_MARGINS: ChartMargins = {
  top: 16,
  right: 16,
  bottom: 28,
  left: 56,
};

export const DEFAULT_BAR_MARGINS: ChartMargins = {
  top: 8,
  right: 16,
  bottom: 8,
  left: 200, // espacio para los nombres de campaña a la izquierda
};

// ---- Escalas lineales ----

export function makeLinearScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): (v: number) => number {
  if (domainMax === domainMin) {
    return () => (rangeMin + rangeMax) / 2;
  }
  const m = (rangeMax - rangeMin) / (domainMax - domainMin);
  return (v) => rangeMin + (v - domainMin) * m;
}

// ---- Escala de fechas ----
// Devuelve para cada YYYY-MM-DD su posición x.
// Soporta gaps: si hay días sin datos, las posiciones quedan equiespaciadas
// por fecha real, no por orden.

export function makeDateScale(
  fromIso: string,
  toIso: string,
  rangeMin: number,
  rangeMax: number,
): (iso: string) => number {
  const fromMs = parseIsoDate(fromIso).getTime();
  const toMs = parseIsoDate(toIso).getTime();
  const scale = makeLinearScale(fromMs, toMs, rangeMin, rangeMax);
  return (iso) => scale(parseIsoDate(iso).getTime());
}

// ---- "Nice" upper bound para el eje Y ----
// Redondea hacia arriba a una potencia de 10 amigable. Ej:
//   max=4870  → 5000
//   max=23900 → 25000
//   max=87    → 100

export function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  const norm = max / base;
  let nice: number;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

// ---- Ticks del eje Y ----
// Devuelve 4-5 valores espaciados desde 0 hasta `max`.

export function yAxisTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i));
}

// ---- Ticks del eje X (fechas) ----
// Devuelve N fechas representativas del rango, sin saturar.

export function xAxisDateTicks(
  fromIso: string,
  toIso: string,
  maxTicks = 6,
): string[] {
  const fromMs = parseIsoDate(fromIso).getTime();
  const toMs = parseIsoDate(toIso).getTime();
  const totalMs = toMs - fromMs;
  if (totalMs <= 0) return [fromIso];

  const stepMs = totalMs / (maxTicks - 1);
  const ticks: string[] = [];
  for (let i = 0; i < maxTicks; i++) {
    ticks.push(toIsoDate(new Date(fromMs + i * stepMs)));
  }
  return ticks;
}

// ---- Path SVG para una línea ----
// points = [{x, y}], devuelve un atributo `d` listo para <path>.

export function pathFromPoints(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
}

// ---- Formato corto de fecha para ejes ----
// 2026-04-15 → "15 abr"

const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function shortDateLabel(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

// ---- Formato compacto de números para ejes Y ----
// 1234567 → "1,2 M"
// 23000   → "23 k"
// 850     → "850"

export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} M`;
  }
  if (abs >= 1_000) {
    return `${(n / 1_000).toFixed(0)} k`;
  }
  return String(Math.round(n));
}
