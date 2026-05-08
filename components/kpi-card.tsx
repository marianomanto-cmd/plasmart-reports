import type { CompareMode, KpiWithDelta } from "@/lib/types";
import {
  formatCurrencyArs,
  formatDeltaPct,
  formatInteger,
} from "@/lib/format";

type Format = "currency" | "number";

interface Props {
  label: string;
  data: KpiWithDelta;
  format: Format;
  compareMode: CompareMode;
  /**
   * Si true, un delta positivo es bueno (verde sobrio).
   * Si false, positivo es malo (cobre).
   * Default: true. En Fase 4.7 cuando agreguemos CPC/CPA en la tabla,
   * vamos a invertirlo para esas métricas.
   */
  positiveIsGood?: boolean;
}

export function KpiCard({
  label,
  data,
  format,
  compareMode,
  positiveIsGood = true,
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
    <div className="border border-border-default bg-white p-6">
      <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
        {label}
      </div>

      <div className="text-[40px] font-bold leading-none tracking-tight text-primary tabular-nums">
        {value}
      </div>

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
    </div>
  );
}
