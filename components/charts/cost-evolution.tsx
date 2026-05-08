// Gráfico de evolución diaria de inversión por publisher.
// SVG vanilla, server-rendered. Dos series: GAds (negro) y Meta (cobre).

import type { DailyByPublisherPoint } from "@/lib/types";
import { formatCurrencyArs } from "@/lib/format";
import {
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

interface Props {
  points: DailyByPublisherPoint[];
  fromIso: string;
  toIso: string;
}

const VIEW_W = 900;
const VIEW_H = 280;

const COLOR_GADS = "#1A1A1A";
const COLOR_META = "#C9A961";

export function CostEvolutionChart({ points, fromIso, toIso }: Props) {
  // Pivot a {date → {gads, meta}}
  const byDate = new Map<string, { gads: number; meta: number }>();
  for (const p of points) {
    const cur = byDate.get(p.date) ?? { gads: 0, meta: 0 };
    if (p.publisher === "gads") cur.gads += p.cost;
    else cur.meta += p.cost;
    byDate.set(p.date, cur);
  }

  const dates = Array.from(byDate.keys()).sort();

  // Estado vacío: sin puntos, mostramos un mensaje y cortamos.
  if (dates.length === 0) {
    return <EmptyState />;
  }

  // Totales por publisher (para la leyenda)
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

  // Escalas
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
  const xTicks = xAxisDateTicks(fromIso, toIso, 6);

  // Si hay un solo punto, dibujamos un círculo en vez de una línea
  // (los <path> con un solo M no se ven).
  const showPointsAsDots = dates.length === 1;

  return (
    <div className="border border-border-default bg-white p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
          Evolución de inversión diaria
        </h3>
        <Legend
          gadsTotal={totalGads}
          metaTotal={totalMeta}
        />
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Gráfico de líneas de inversión diaria por publisher"
      >
        {/* Grilla horizontal + ticks Y */}
        {yTicks.map((t, i) => {
          const y = yScale(t);
          return (
            <g key={i}>
              <line
                x1={m.left}
                x2={VIEW_W - m.right}
                y1={y}
                y2={y}
                stroke="#D0D0D0"
                strokeWidth={i === 0 ? 1 : 0.5}
                strokeDasharray={i === 0 ? "" : "2 3"}
              />
              <text
                x={m.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="#8A8A8A"
                fontSize={10}
                fontFamily="var(--font-sans)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {compactNumber(t)}
              </text>
            </g>
          );
        })}

        {/* Ticks X */}
        {xTicks.map((iso, i) => {
          const x = xScale(iso);
          return (
            <text
              key={i}
              x={x}
              y={VIEW_H - m.bottom + 16}
              textAnchor="middle"
              fill="#8A8A8A"
              fontSize={10}
              fontFamily="var(--font-sans)"
            >
              {shortDateLabel(iso)}
            </text>
          );
        })}

        {/* Series */}
        {showPointsAsDots ? (
          <>
            <circle cx={gadsPoints[0].x} cy={gadsPoints[0].y} r={4} fill={COLOR_GADS} />
            <circle cx={metaPoints[0].x} cy={metaPoints[0].y} r={4} fill={COLOR_META} />
          </>
        ) : (
          <>
            <path
              d={pathFromPoints(metaPoints)}
              fill="none"
              stroke={COLOR_META}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={pathFromPoints(gadsPoints)}
              fill="none"
              stroke={COLOR_GADS}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ---------- Sub-componentes ----------

function Legend({ gadsTotal, metaTotal }: { gadsTotal: number; metaTotal: number }) {
  return (
    <div className="flex items-center gap-5 text-xs">
      <LegendItem color={COLOR_GADS} label="Google Ads" total={gadsTotal} />
      <LegendItem color={COLOR_META} label="Meta Ads" total={metaTotal} />
    </div>
  );
}

function LegendItem({
  color,
  label,
  total,
}: {
  color: string;
  label: string;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-block h-0.5 w-4"
        style={{ backgroundColor: color }}
      />
      <span className="text-[11px] uppercase tracking-[0.12em] text-light">
        {label}
      </span>
      <span className="text-[12px] font-semibold tabular-nums text-primary">
        {formatCurrencyArs(total)}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-border-default bg-white p-6">
      <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
        Evolución de inversión diaria
      </h3>
      <div className="flex h-[240px] items-center justify-center text-sm text-light">
        Sin datos en el rango seleccionado
      </div>
    </div>
  );
}
