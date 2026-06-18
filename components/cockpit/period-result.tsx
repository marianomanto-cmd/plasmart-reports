import { RiCheckboxCircleLine } from "@remixicon/react";
import type { DashboardKpis } from "@/lib/types";
import { formatCurrencyArs, formatInteger } from "@/lib/format";
import { Panel, PanelHead } from "./panel";

/**
 * "Resultado del período": consultas totales + costo por consulta +
 * ritmo diario, con un pill cualitativo.
 */
export function PeriodResult({
  kpis,
  days,
}: {
  kpis: DashboardKpis;
  days: number;
}) {
  const consultas = kpis.conversions.current;
  const cpa = consultas > 0 ? kpis.cost.current / consultas : null;
  const perDay = days > 0 ? consultas / days : 0;

  return (
    <Panel>
      <PanelHead title="Resultado del período" right="Mensual" />
      <div className="flex items-center gap-4">
        <span className="neon-gradient flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <RiCheckboxCircleLine className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="font-data text-2xl font-extrabold leading-none text-foreground tabular-nums">
            {formatInteger(consultas)} consultas
          </div>
          <div className="mt-1.5 text-xs text-light">
            {cpa !== null ? formatCurrencyArs(cpa) : "—"} por consulta ·{" "}
            {perDay.toLocaleString("es-AR", { maximumFractionDigits: 1 })} por día
          </div>
        </div>
        {consultas > 0 && (
          <span className="pill pill-ok ml-auto shrink-0">¡buen ritmo!</span>
        )}
      </div>
    </Panel>
  );
}
