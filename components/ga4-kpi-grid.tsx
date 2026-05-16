import {
  RiArrowRightUpLine,
  RiArrowRightDownLine,
  RiSubtractLine,
} from "@remixicon/react";
import type { CompareMode, Ga4Kpis, KpiWithDelta } from "@/lib/types";
import { KpiCard } from "./kpi-card";
import { formatDeltaPct, formatRatioAsPct } from "@/lib/format";
import { Card } from "@/components/tremor/card";

interface Props {
  kpis: Ga4Kpis;
  compareMode: CompareMode;
}

export function Ga4KpiGrid({ kpis, compareMode }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Sesiones"
        data={kpis.sessions}
        format="number"
        compareMode={compareMode}
      />
      <KpiCard
        label="Usuarios"
        data={kpis.users}
        format="number"
        compareMode={compareMode}
      />
      <KpiCard
        label="Eventos clave"
        data={kpis.keyEvents}
        format="number"
        compareMode={compareMode}
      />
      {/* Bounce rate: ratio 0..1, "más es peor" */}
      <BounceRateCard data={kpis.bounceRate} compareMode={compareMode} />
    </div>
  );
}

/**
 * Card especial para bounce rate. KpiCard formatea como número o currency,
 * pero el bounce rate es un ratio. Replicamos la estructura visual del
 * KpiCard pero con formato % y semántica invertida (subir es malo).
 */
function BounceRateCard({
  data,
  compareMode,
}: {
  data: KpiWithDelta;
  compareMode: CompareMode;
}) {
  const value = formatRatioAsPct(data.current);

  const showDelta = data.previous !== null && compareMode !== "none";
  const delta = data.deltaPct;
  const isFlat = delta === null || delta === 0;
  const isUp = delta !== null && delta > 0;
  // Subir el bounce rate es malo → favorable cuando baja
  const isFavorable = isFlat ? null : !isUp;

  const deltaColor =
    isFavorable === null
      ? "text-light"
      : isFavorable
      ? "text-success"
      : "text-warning";

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

      <div className="mb-3 eyebrow-xs sm:mb-4">Bounce rate</div>

      <div className="break-words text-[26px] font-bold leading-none tracking-tight text-primary tabular-nums sm:text-[40px]">
        {value}
      </div>

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
