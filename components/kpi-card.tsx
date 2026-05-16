import { RiArrowRightUpLine, RiArrowRightDownLine, RiSubtractLine } from "@remixicon/react";
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

  // Tinte del stripe superior según signo del delta.
  // Sin comparación o flat → accent neutro.
  const stripeColor =
    !showDelta || isFavorable === null
      ? "bg-brand"
      : isFavorable
      ? "bg-success"
      : "bg-warning";

  const DeltaIcon = isFlat
    ? RiSubtractLine
    : isUp
    ? RiArrowRightUpLine
    : RiArrowRightDownLine;

  const compareLabel =
    compareMode === "yoy" ? "vs año anterior" : "vs período anterior";

  return (
    <Card className="relative min-w-0 overflow-hidden p-4 sm:p-6">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 ${stripeColor}`}
      />

      <div className="mb-3 eyebrow-xs sm:mb-4">{label}</div>

      <div className="break-words text-[26px] font-bold leading-none tracking-tight text-primary tabular-nums sm:text-[40px]">
        {value}
      </div>

      {sparkline && sparkline.length >= 2 && (
        <div className="mt-3">
          <Sparkline values={sparkline} highlightLast showBaseline />
        </div>
      )}

      {showDelta && (
        <div className={`mt-4 flex items-center gap-1.5 text-sm tabular-nums ${deltaColor}`}>
          <DeltaIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="font-semibold">{formatDeltaPct(delta)}</span>
          <span className="ml-1 text-[10px] font-medium uppercase tracking-[0.16em] text-light">
            {compareLabel}
          </span>
        </div>
      )}
    </Card>
  );
}
