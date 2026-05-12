// Top 10 campañas por inversión en el período. Barras horizontales.
// Server Component, SVG vanilla.

import type { CampaignRow } from "@/lib/types";
import { formatCurrencyArs } from "@/lib/format";
import {
  DEFAULT_BAR_MARGINS,
  makeLinearScale,
  niceCeiling,
} from "@/lib/svg-charts";

interface Props {
  rows: CampaignRow[];
}

const ROW_HEIGHT = 32;
const ROW_GAP = 6;
const VIEW_W = 900;
const COLOR_GADS = "#0f172a";
const COLOR_META = "#2563eb";
const TRACK_COLOR = "#F0EFEA";

export function TopCampaignsChart({ rows }: Props) {
  // Asumimos que vienen ya ordenadas por cost desc desde la RPC.
  // Igual hacemos el top 10 acá por seguridad.
  const top = rows.slice(0, 10);

  if (top.length === 0) {
    return <EmptyState />;
  }

  const maxCost = Math.max(...top.map((r) => r.cost));
  const xMax = niceCeiling(maxCost);

  const m = DEFAULT_BAR_MARGINS;
  const trackEnd = VIEW_W - m.right;
  const xScale = makeLinearScale(0, xMax, m.left, trackEnd);

  const viewH = m.top + top.length * (ROW_HEIGHT + ROW_GAP) + m.bottom;

  return (
    <div className="border border-border-default bg-white p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
          Top campañas por inversión
        </h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-light">
          {top.length} de {rows.length}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${viewH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Top campañas por inversión, barras horizontales"
      >
        {top.map((row, i) => {
          const y = m.top + i * (ROW_HEIGHT + ROW_GAP);
          const barEnd = xScale(row.cost);
          const color = row.publisher === "gads" ? COLOR_GADS : COLOR_META;

          return (
            <g key={row.campaignId}>
              {/* Track de fondo */}
              <rect
                x={m.left}
                y={y}
                width={trackEnd - m.left}
                height={ROW_HEIGHT}
                fill={TRACK_COLOR}
              />

              {/* Barra */}
              <rect
                x={m.left}
                y={y}
                width={Math.max(barEnd - m.left, 1)}
                height={ROW_HEIGHT}
                fill={color}
              />

              {/* Nombre de campaña a la izquierda */}
              <text
                x={m.left - 12}
                y={y + ROW_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fill="#0f172a"
                fontSize={12}
                fontFamily="var(--font-sans)"
              >
                {truncate(row.name, 30)}
              </text>

              {/* Publisher pill — pequeño label dentro del margen izq */}
              <text
                x={m.left - 12}
                y={y + ROW_HEIGHT / 2 + 14}
                textAnchor="end"
                dominantBaseline="middle"
                fill="#94a3b8"
                fontSize={9}
                fontFamily="var(--font-sans)"
                style={{ letterSpacing: "0.1em" }}
              >
                {row.publisher === "gads" ? "GOOGLE ADS" : "META ADS"} ·{" "}
                {row.type.toUpperCase()}
              </text>

              {/* Valor a la derecha de la barra */}
              <text
                x={barEnd + 8}
                y={y + ROW_HEIGHT / 2}
                dominantBaseline="middle"
                fill="#0f172a"
                fontSize={12}
                fontFamily="var(--font-sans)"
                fontWeight={600}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatCurrencyArs(row.cost)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------- Helpers ----------

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function EmptyState() {
  return (
    <div className="border border-border-default bg-white p-6">
      <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
        Top campañas por inversión
      </h3>
      <div className="flex h-[200px] items-center justify-center text-sm text-light">
        Sin campañas en el rango seleccionado
      </div>
    </div>
  );
}
