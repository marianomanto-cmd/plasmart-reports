import type { CompareMode, Ga4Kpis, KpiWithDelta } from "@/lib/types";
import { KpiCard } from "./kpi-card";
import { formatDeltaPct, formatRatioAsPct } from "@/lib/format";

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

  const compareLabel =
    compareMode === "yoy" ? "vs año anterior" : "vs período anterior";

  return (
    <div className="border border-border-default bg-white p-6">
      <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
        Bounce rate
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
