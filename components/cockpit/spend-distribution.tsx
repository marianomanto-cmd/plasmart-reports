import type { SpendSlice } from "@/lib/insights";
import { formatCurrencyArs, formatRatioAsPct } from "@/lib/format";
import { Panel, PanelHead } from "./panel";

const PUB = {
  gads: { dot: "#2bffae", fill: "linear-gradient(90deg,#2bffae,#5cffc8)" },
  meta: { dot: "#b6ff3d", fill: "linear-gradient(90deg,#b6ff3d,#d6ff7a)" },
} as const;

const WASTE_FILL = "linear-gradient(90deg,#f87171,#b91c1c)";

/**
 * "¿A dónde va la plata?" — top campañas por inversión, barra proporcional
 * a la mayor. Las campañas marcadas como desperdicio se tiñen de rojo.
 */
export function SpendDistribution({
  data,
  right,
}: {
  data: { slices: SpendSlice[]; rest: number; total: number };
  right?: string;
}) {
  const { slices, rest } = data;
  const maxCost = Math.max(...slices.map((s) => s.cost), 1);

  return (
    <Panel className="h-full">
      <PanelHead
        title="¿A dónde va la plata?"
        sub="Top campañas por inversión"
        right={right}
      />
      {slices.length === 0 ? (
        <p className="py-8 text-center text-sm text-light">
          Sin inversión en el período.
        </p>
      ) : (
        <div className="space-y-2.5">
          {slices.map((s) => {
            const pub = PUB[s.publisher];
            return (
              <div key={s.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{ background: s.wasteful ? "#f87171" : pub.dot }}
                    />
                    <span className="truncate" title={s.name}>
                      {s.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-data tabular-nums text-steel">
                    {formatCurrencyArs(s.cost)} ·{" "}
                    <span className="text-light">{formatRatioAsPct(s.share)}</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((s.cost / maxCost) * 100, 3)}%`,
                      background: s.wasteful ? WASTE_FILL : pub.fill,
                    }}
                  />
                </div>
              </div>
            );
          })}
          {rest > 0 && (
            <p className="pt-1 text-[11px] text-light">
              + resto de campañas:{" "}
              <span className="font-data text-steel">
                {formatCurrencyArs(rest)}
              </span>
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
