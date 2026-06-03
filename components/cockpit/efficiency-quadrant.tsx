import type { EfficiencyPoint } from "@/lib/insights";
import { formatCurrencyArs, formatInteger } from "@/lib/format";
import { Panel, PanelHead } from "./panel";

const PUB_COLOR = { gads: "#38bdf8", meta: "#a78bfa" } as const;

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const shortName = (n: string) => (n.length > 12 ? n.slice(0, 11) + "…" : n);

/**
 * Scatter de eficiencia: CPA (eje Y, invertido — abajo es mejor) vs
 * volumen de consultas (eje X). El tamaño de la burbuja es la inversión.
 * Cuatro cuadrantes accionables: Escalar / Vigilar / Optimizar / Cortar.
 */
export function EfficiencyQuadrant({ points }: { points: EfficiencyPoint[] }) {
  const L = 54,
    R = 596,
    T = 24,
    B = 196;

  if (points.length === 0) {
    return (
      <Panel className="h-full">
        <PanelHead title="Eficiencia: CPA vs volumen de consultas" />
        <p className="py-10 text-center text-sm text-light">
          Sin campañas con inversión en el período.
        </p>
      </Panel>
    );
  }

  const maxConv = Math.max(...points.map((p) => p.conversions), 1);
  const cpaVals = points
    .map((p) => p.cpa)
    .filter((v): v is number => v !== null);
  const maxCpa = cpaVals.length ? Math.max(...cpaVals) * 1.15 : 1;
  const maxCost = Math.max(...points.map((p) => p.cost), 1);

  const xOf = (conv: number) => L + (conv / maxConv) * (R - L);
  const yOf = (cpa: number | null) =>
    T + (1 - (cpa ?? maxCpa) / maxCpa) * (B - T);
  const rOf = (cost: number) => 5 + (cost / maxCost) * 13;
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  const xSplit = xOf(median(points.map((p) => p.conversions)));
  const ySplit = yOf(median(cpaVals.length ? cpaVals : [maxCpa / 2]));

  // Etiquetar las 3 campañas de mayor inversión.
  const labelIds = new Set(
    [...points].sort((a, b) => b.cost - a.cost).slice(0, 3).map((p) => p.id),
  );

  return (
    <Panel className="h-full">
      <PanelHead
        title="Eficiencia: CPA vs volumen de consultas"
        sub="Tamaño de burbuja = inversión"
        right="por campaña"
      />
      <svg
        viewBox="0 0 640 250"
        className="w-full"
        role="img"
        aria-label="Dispersión de campañas por CPA y volumen de consultas"
      >
        {/* quadrant split */}
        <line x1={xSplit} y1={T} x2={xSplit} y2={B} stroke="rgba(255,255,255,.08)" strokeDasharray="3 4" />
        <line x1={L} y1={ySplit} x2={R} y2={ySplit} stroke="rgba(255,255,255,.08)" strokeDasharray="3 4" />
        {/* axes */}
        <line x1={L} y1={B} x2={R} y2={B} stroke="rgba(255,255,255,.14)" />
        <line x1={L} y1={T} x2={L} y2={B} stroke="rgba(255,255,255,.14)" />

        {/* axis labels */}
        <text x={L} y={T - 4} className="font-data" fontSize="9" fill="#65788a">CPA alto</text>
        <text x={L} y={B + 16} className="font-data" fontSize="9" fill="#65788a">CPA bajo · ↑ mejor</text>
        <text x={R} y={B + 16} textAnchor="end" className="font-data" fontSize="9" fill="#65788a">+ consultas →</text>

        {/* quadrant tags */}
        <text x={xSplit - 8} y={T + 14} textAnchor="end" fontSize="9" letterSpacing="1" fill="rgba(248,113,113,.75)">CORTAR</text>
        <text x={xSplit + 8} y={T + 14} fontSize="9" letterSpacing="1" fill="rgba(251,191,36,.75)">VIGILAR</text>
        <text x={xSplit - 8} y={B - 8} textAnchor="end" fontSize="9" letterSpacing="1" fill="rgba(56,189,248,.75)">OPTIMIZAR</text>
        <text x={xSplit + 8} y={B - 8} fontSize="9" letterSpacing="1" fill="rgba(52,211,153,.85)">ESCALAR ◢</text>

        {/* bubbles — posiciones clampeadas al área de plot para no recortar */}
        {points.map((p) => {
          const color = PUB_COLOR[p.publisher];
          const r = rOf(p.cost);
          const cx = clamp(xOf(p.conversions), L + r, 636 - r);
          const cy = clamp(yOf(p.cpa), T + r, B - r);
          // Etiqueta arriba; si toca el borde superior, va abajo.
          const ly = cy - r - 5 < T + 10 ? cy + r + 12 : cy - r - 5;
          const lx = clamp(cx, 46, 600);
          return (
            <g key={p.id}>
              <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.16} stroke={color} strokeOpacity={0.9}>
                <title>
                  {p.name} · {formatInteger(p.conversions)} consultas · CPA{" "}
                  {p.cpa !== null ? formatCurrencyArs(p.cpa) : "sin consultas"} ·{" "}
                  {formatCurrencyArs(p.cost)}
                </title>
              </circle>
              {labelIds.has(p.id) && (
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  fontSize="9"
                  className="font-data"
                  fill={color}
                >
                  {shortName(p.name)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}
