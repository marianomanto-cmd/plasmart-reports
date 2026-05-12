// Generadores de SVG inline para el email semanal.
// Producen strings de <svg>...</svg> autocontenidos, sin JSX ni DOM,
// para meter directo en el HTML del mail. Estilo industrial-azul
// alineado a la paleta del dashboard.

import type { CampaignRow, DailyByPublisherPoint } from "@/lib/types";
import {
  DEFAULT_BAR_MARGINS,
  DEFAULT_LINE_MARGINS,
  compactNumber,
  makeDateScale,
  makeLinearScale,
  niceCeiling,
  pathFromPoints,
  shortDateLabel,
  xAxisDateTicks,
  yAxisTicks,
} from "@/lib/svg-charts";
import { formatCurrencyArs } from "@/lib/format";

// Paleta (mismos hex que :root del dashboard)
const C_PRIMARY = "#0f172a"; // slate-900
const C_ACCENT = "#2563eb"; // blue-600
const C_LIGHT = "#94a3b8"; // slate-400
const C_BORDER = "#e2e8f0"; // slate-200

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Gráfico de líneas: evolución diaria de inversión, una línea por publisher.
 * Devuelve un string SVG completo, ancho 100%, altura intrínseca.
 */
export function renderCostEvolutionSvg(
  points: DailyByPublisherPoint[],
  fromIso: string,
  toIso: string,
): string {
  const VIEW_W = 600;
  const VIEW_H = 220;

  const byDate = new Map<string, { gads: number; meta: number }>();
  for (const p of points) {
    const cur = byDate.get(p.date) ?? { gads: 0, meta: 0 };
    if (p.publisher === "gads") cur.gads += p.cost;
    else cur.meta += p.cost;
    byDate.set(p.date, cur);
  }
  const dates = Array.from(byDate.keys()).sort();

  if (dates.length === 0) {
    return emptyChartSvg("Sin datos en el período", VIEW_W, VIEW_H);
  }

  let totalGads = 0;
  let totalMeta = 0;
  let maxValue = 0;
  for (const d of dates) {
    const v = byDate.get(d)!;
    totalGads += v.gads;
    totalMeta += v.meta;
    if (v.gads > maxValue) maxValue = v.gads;
    if (v.meta > maxValue) maxValue = v.meta;
  }

  const yMax = niceCeiling(maxValue);
  const m = DEFAULT_LINE_MARGINS;
  const xScale = makeDateScale(fromIso, toIso, m.left, VIEW_W - m.right);
  const yScale = makeLinearScale(0, yMax, VIEW_H - m.bottom, m.top);

  const gadsPoints = dates.map((d) => ({
    x: xScale(d),
    y: yScale(byDate.get(d)!.gads),
  }));
  const metaPoints = dates.map((d) => ({
    x: xScale(d),
    y: yScale(byDate.get(d)!.meta),
  }));

  const yTicks = yAxisTicks(yMax, 4);
  const xTicks = xAxisDateTicks(fromIso, toIso, 5);
  const singlePoint = dates.length === 1;

  const grid = yTicks
    .map((t, i) => {
      const y = yScale(t);
      return `
        <line x1="${m.left}" x2="${VIEW_W - m.right}" y1="${y}" y2="${y}"
              stroke="${C_BORDER}" stroke-width="${i === 0 ? 1 : 0.5}"
              stroke-dasharray="${i === 0 ? "" : "2 3"}" />
        <text x="${m.left - 8}" y="${y}" text-anchor="end" dominant-baseline="middle"
              fill="${C_LIGHT}" font-size="10" font-family="${FONT}">
          ${compactNumber(t)}
        </text>`;
    })
    .join("");

  const xLabels = xTicks
    .map((iso) => {
      const x = xScale(iso);
      return `
        <text x="${x}" y="${VIEW_H - m.bottom + 16}" text-anchor="middle"
              fill="${C_LIGHT}" font-size="10" font-family="${FONT}">
          ${shortDateLabel(iso)}
        </text>`;
    })
    .join("");

  const series = singlePoint
    ? `
      <circle cx="${gadsPoints[0].x}" cy="${gadsPoints[0].y}" r="4" fill="${C_PRIMARY}" />
      <circle cx="${metaPoints[0].x}" cy="${metaPoints[0].y}" r="4" fill="${C_ACCENT}" />`
    : `
      <path d="${pathFromPoints(metaPoints)}" fill="none" stroke="${C_ACCENT}"
            stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <path d="${pathFromPoints(gadsPoints)}" fill="none" stroke="${C_PRIMARY}"
            stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;

  const legend = `
    <div style="display:flex;gap:20px;font-family:${FONT};font-size:12px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:14px;height:2px;background:${C_PRIMARY};"></span>
        <span style="color:${C_LIGHT};text-transform:uppercase;letter-spacing:0.12em;font-size:10px;">Google Ads</span>
        <strong style="color:${C_PRIMARY};">${formatCurrencyArs(totalGads)}</strong>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:14px;height:2px;background:${C_ACCENT};"></span>
        <span style="color:${C_LIGHT};text-transform:uppercase;letter-spacing:0.12em;font-size:10px;">Meta Ads</span>
        <strong style="color:${C_PRIMARY};">${formatCurrencyArs(totalMeta)}</strong>
      </div>
    </div>`;

  return `
    ${legend}
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg"
         style="display:block;width:100%;height:auto;max-width:${VIEW_W}px;">
      ${grid}
      ${xLabels}
      ${series}
    </svg>`;
}

/**
 * Top campañas: barras horizontales, una fila por campaña.
 * Devuelve un string SVG completo.
 */
export function renderTopCampaignsSvg(rows: CampaignRow[], maxRows = 8): string {
  const top = rows.slice(0, maxRows);
  if (top.length === 0) {
    return emptyChartSvg("Sin campañas en el período", 600, 200);
  }

  const ROW_HEIGHT = 28;
  const ROW_GAP = 6;
  const VIEW_W = 600;

  const maxCost = Math.max(...top.map((r) => r.cost));
  const xMax = niceCeiling(maxCost);

  const m = { top: 8, right: 16, bottom: 8, left: 180 };
  const trackEnd = VIEW_W - m.right;
  const xScale = makeLinearScale(0, xMax, m.left, trackEnd);
  const viewH = m.top + top.length * (ROW_HEIGHT + ROW_GAP) + m.bottom;

  const bars = top
    .map((row, i) => {
      const y = m.top + i * (ROW_HEIGHT + ROW_GAP);
      const barEnd = xScale(row.cost);
      const color = row.publisher === "gads" ? C_PRIMARY : C_ACCENT;
      const labelName = truncate(row.name, 26);
      const publisherLabel = row.publisher === "gads" ? "GADS" : "META";
      return `
        <rect x="${m.left}" y="${y}" width="${trackEnd - m.left}" height="${ROW_HEIGHT}"
              fill="${C_BORDER}" />
        <rect x="${m.left}" y="${y}" width="${Math.max(barEnd - m.left, 1)}" height="${ROW_HEIGHT}"
              fill="${color}" />
        <text x="${m.left - 8}" y="${y + ROW_HEIGHT / 2 - 1}" text-anchor="end"
              dominant-baseline="middle" fill="${C_PRIMARY}" font-size="11" font-family="${FONT}">
          ${escapeXml(labelName)}
        </text>
        <text x="${m.left - 8}" y="${y + ROW_HEIGHT / 2 + 11}" text-anchor="end"
              dominant-baseline="middle" fill="${C_LIGHT}" font-size="9" font-family="${FONT}"
              letter-spacing="0.1em">
          ${publisherLabel}
        </text>
        <text x="${barEnd + 6}" y="${y + ROW_HEIGHT / 2}" dominant-baseline="middle"
              fill="${C_PRIMARY}" font-size="11" font-weight="600" font-family="${FONT}">
          ${escapeXml(formatCurrencyArs(row.cost))}
        </text>`;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${VIEW_W} ${viewH}" xmlns="http://www.w3.org/2000/svg"
         style="display:block;width:100%;height:auto;max-width:${VIEW_W}px;">
      ${bars}
    </svg>`;
}

function emptyChartSvg(label: string, w: number, h: number): string {
  return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"
         style="display:block;width:100%;height:auto;max-width:${w}px;">
      <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle"
            fill="${C_LIGHT}" font-size="13" font-family="${FONT}">
        ${escapeXml(label)}
      </text>
    </svg>`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
