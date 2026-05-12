import type { CompareMode, KpiWithDelta } from "@/lib/types";
import {
  formatCurrencyArs,
  formatDeltaPct,
  formatInteger,
} from "@/lib/format";
import { Card } from "@/components/tremor/card";
import { Sparkline } from "./sparkline";

type Format = "currency" | "number";

interface Props {
  label: string;
  data: KpiWithDelta;
  format: Format;
  compareMode: CompareMode;
  /**
   * Si true, un delta positivo es bueno (verde sobrio).
   * Si false, positivo es malo (cobre).
   * Default: true.
   */
  positiveIsGood?: boolean;
  /** Serie diaria del KPI para el sparkline. Opcional. */
  sparkline?: number[];
}

export function KpiCard({
  label,
  data,
  format,
  compareMode,
  positiveIsGood = true,
  sparkline,
}: Props) {
  const value =
    format === "currency"
      ? formatCurrencyArs(data.current)
      : formatInteger(data.current);

  const showDelta = data.previous !== null && compareMode !== "none";
  const delta = data.deltaPct;
  const isFlat = delta === null || delta === 0;
  const isUp = delta !== null && delta > 0;
  const isFavorable = isFlat ? null : isUp ? positiveIsGood : !positiveIsGood;

  const deltaColor =
    isFavorable === null
      ? "text-light"
      : isFavorable
      ? "text-success"
      : "text-warning";

  const compareLabel =
    compareMode === "yoy" ? "vs año anterior" : "vs período anterior";

  return (
    <Card className="min-w-0 p-4 sm:p-6">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-light sm:mb-4">
        {label}
      </div>

      <div className="break-words text-[26px] font-bold leading-none tracking-tight text-primary tabular-nums sm:text-[40px]">
        {value}
      </div>

      {sparkline && sparkline.length >= 2 && (
        <div className="mt-3">
          <Sparkline values={sparkline} />
        </div>
      )}

      {showDelta && (
        <div className={`mt-4 flex items-center gap-2 text-sm tabular-nums ${deltaColor}`}>
          <span aria-hidden="true" className="text-base leading-none">
            {isFlat ? "·" : isUp ? "▲" : "▼"}
          </span>
          <span className="font-semibold">{formatDeltaPct(delta)}</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-light">
            {compareLabel}
          </span>
        </div>
      )}
    </Card>
  );
}
