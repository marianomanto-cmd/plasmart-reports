import {
  RiArrowRightUpLine,
  RiArrowRightDownLine,
} from "@remixicon/react";
import { formatCurrencyArs } from "@/lib/format";
import { Panel, PanelHead } from "./panel";

/**
 * Donut "Reparto de inversión" GAds vs Meta (conic-gradient, sin lib).
 * Centro = share de Google Ads. Leyenda con montos + CPA combinado.
 */
export function SpendDonut({
  gadsCost,
  metaCost,
  cpaCombined,
  cpaDeltaPct,
}: {
  gadsCost: number;
  metaCost: number;
  cpaCombined: number | null;
  cpaDeltaPct: number | null;
}) {
  const total = gadsCost + metaCost;
  const gadsShare = total > 0 ? gadsCost / total : 0;
  const gadsPct = Math.round(gadsShare * 100);
  const metaPct = 100 - gadsPct;
  const deg = gadsShare * 360;

  const cpaDown = cpaDeltaPct !== null && cpaDeltaPct < 0;

  return (
    <Panel className="h-full">
      <PanelHead title="Reparto de inversión" right="Mensual" />
      <div className="flex flex-wrap items-center gap-5">
        <div
          className="an-donut relative size-[140px] shrink-0"
          role="img"
          aria-label={`Google Ads ${gadsPct}%, Meta Ads ${metaPct}%`}
        >
          <div
            className="size-full rounded-full"
            style={{
              background: `conic-gradient(var(--color-gads) 0 ${deg}deg, var(--color-meta) ${deg}deg 360deg)`,
            }}
          />
          <div className="absolute inset-[20%] flex flex-col items-center justify-center rounded-full bg-[rgba(4,14,10,0.78)] backdrop-blur-sm">
            <span className="font-data text-[30px] font-extrabold leading-none text-foreground tabular-nums">
              {gadsPct}%
            </span>
            <span className="mt-1 text-[10px] text-light">Google Ads</span>
          </div>
        </div>

        <div className="min-w-[150px] flex-1">
          <LegendRow
            color="var(--color-gads)"
            label="Google Ads"
            amount={gadsCost}
            pct={gadsPct}
          />
          <LegendRow
            color="var(--color-meta)"
            label="Meta Ads"
            amount={metaCost}
            pct={metaPct}
          />
          <div className="mt-3 border-t border-border-soft pt-3">
            <div className="eyebrow-xs">CPA combinado</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-data text-lg font-bold text-foreground tabular-nums">
                {cpaCombined !== null ? formatCurrencyArs(cpaCombined) : "—"}
              </span>
              {cpaDeltaPct !== null && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold ${cpaDown ? "text-success" : "text-warning"}`}
                >
                  {cpaDown ? (
                    <RiArrowRightDownLine className="size-3.5" aria-hidden="true" />
                  ) : (
                    <RiArrowRightUpLine className="size-3.5" aria-hidden="true" />
                  )}
                  {Math.abs(cpaDeltaPct).toLocaleString("es-AR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function LegendRow({
  color,
  label,
  amount,
  pct,
}: {
  color: string;
  label: string;
  amount: number;
  pct: number;
}) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <span
        className="size-2.5 shrink-0 translate-y-0.5 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-light">{label}</div>
        <div className="font-data text-sm font-bold text-foreground tabular-nums">
          {formatCurrencyArs(amount)}{" "}
          <span className="text-[11px] font-medium text-light">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
