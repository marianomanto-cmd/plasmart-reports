import { Fragment } from "react";
import type { FunnelStage } from "@/lib/insights";
import { formatInteger, formatRatioAsPct } from "@/lib/format";
import { Panel, PanelHead } from "./panel";

// Gradiente por etapa (Reactor Neon): esmeralda → teal → lima.
const GRAD = [
  "linear-gradient(90deg,#2bffae,#5cffc8)",
  "linear-gradient(90deg,#1fd6c4,#2bffae)",
  "linear-gradient(90deg,#b6ff3d,#d6ff7a)",
];

/**
 * Embudo impresiones → clics → consultas. El ancho usa una escala
 * perceptual (^0.4) porque la caída real es tan grande que a escala
 * lineal las etapas finales serían invisibles; los valores y las tasas
 * exactas van siempre en texto.
 */
export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <Panel className="h-full">
      <PanelHead title="Embudo del período" sub="Impresiones → clics → consultas" />
      <div className="space-y-1">
        {stages.map((s, i) => {
          const width = Math.max(Math.pow(s.value / max, 0.4) * 100, 9);
          return (
            <Fragment key={s.label}>
              {s.rate !== null && (
                <p className="py-1 text-center text-[11px] text-light">
                  {s.rateLabel}{" "}
                  <b className="font-data font-semibold text-success">
                    {formatRatioAsPct(s.rate)}
                  </b>{" "}
                  ↓
                </p>
              )}
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-xs text-steel">{s.label}</span>
                  <b className="font-data text-sm font-semibold text-foreground">
                    {formatInteger(s.value)}
                  </b>
                </div>
                <div
                  className="h-8 rounded-lg"
                  style={{
                    width: `${width.toFixed(1)}%`,
                    background: GRAD[i] ?? GRAD[2],
                    boxShadow: "0 0 16px rgba(56,189,248,.12)",
                  }}
                />
              </div>
            </Fragment>
          );
        })}
      </div>
    </Panel>
  );
}
