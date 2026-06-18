import type { DailyTotalsPoint } from "@/lib/types";
import { parseIsoDate } from "@/lib/dates";
import { Panel, PanelHead } from "./panel";

const LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// getUTCDay(): 0=Dom..6=Sáb → orden Lun→Dom
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * "Inversión por día": gasto agregado por día de la semana (Lun→Dom)
 * como barras translúcidas; las 2 más altas se pintan en neón. El % es
 * el share del gasto semanal. Sin lib — divs con height %.
 */
export function DailyBars({ daily }: { daily: DailyTotalsPoint[] }) {
  const byDow = new Array(7).fill(0) as number[];
  for (const d of daily) {
    byDow[parseIsoDate(d.date).getUTCDay()] += d.cost;
  }
  const values = DOW_ORDER.map((i) => byDow[i]);
  const total = values.reduce((s, v) => s + v, 0);
  const max = Math.max(...values, 1);

  // Índices de las dos barras más altas, para resaltarlas.
  const top2 = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map((x) => x.i);

  return (
    <Panel className="flex h-full flex-col">
      <PanelHead title="Inversión por día" right="Semanal" />
      <div className="flex flex-1 items-end gap-2 sm:gap-3">
        {values.map((v, i) => {
          const heightPct = Math.max((v / max) * 100, 4);
          const sharePct = total > 0 ? Math.round((v / total) * 100) : 0;
          const highlight = top2.includes(i) && v > 0;
          return (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex h-[140px] w-full items-end sm:h-[180px]">
                <div
                  className="an-grow w-full rounded-t-md"
                  style={{
                    height: `${heightPct}%`,
                    animationDelay: `${0.15 + i * 0.06}s`,
                    background: highlight
                      ? "linear-gradient(180deg,#b6ff3d,#2bffae)"
                      : "rgba(255,255,255,0.07)",
                    border: highlight
                      ? "1px solid rgba(43,255,174,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className={`pt-1 text-center text-[10px] font-bold tabular-nums ${highlight ? "text-[#04140d]" : "text-light"}`}
                  >
                    {sharePct > 0 ? `${sharePct}%` : ""}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-medium text-light">{LABELS[i]}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
