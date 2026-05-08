import type { CompareMode, DashboardKpis } from "@/lib/types";
import { KpiCard } from "./kpi-card";

interface Props {
  kpis: DashboardKpis;
  compareMode: CompareMode;
}

export function KpiGrid({ kpis, compareMode }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Inversión total"
        data={kpis.cost}
        format="currency"
        compareMode={compareMode}
      />
      <KpiCard
        label="Impresiones"
        data={kpis.impressions}
        format="number"
        compareMode={compareMode}
      />
      <KpiCard
        label="Clics"
        data={kpis.clicks}
        format="number"
        compareMode={compareMode}
      />
      <KpiCard
        label="Conversiones"
        data={kpis.conversions}
        format="number"
        compareMode={compareMode}
      />
    </div>
  );
}
