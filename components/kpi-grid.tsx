import type {
  CompareMode,
  DailyTotalsPoint,
  DashboardKpis,
} from "@/lib/types";
import { KpiCard } from "./kpi-card";

interface Props {
  kpis: DashboardKpis;
  compareMode: CompareMode;
  /** Serie diaria de los KPIs para los sparklines. Opcional. */
  daily?: DailyTotalsPoint[];
}

export function KpiGrid({ kpis, compareMode, daily }: Props) {
  const costSeries = daily?.map((d) => d.cost) ?? [];
  const impressionsSeries = daily?.map((d) => d.impressions) ?? [];
  const clicksSeries = daily?.map((d) => d.clicks) ?? [];
  const conversionsSeries = daily?.map((d) => d.conversions) ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Inversión total"
        data={kpis.cost}
        format="currency"
        compareMode={compareMode}
        sparkline={costSeries}
      />
      <KpiCard
        label="Impresiones"
        data={kpis.impressions}
        format="number"
        compareMode={compareMode}
        sparkline={impressionsSeries}
      />
      <KpiCard
        label="Clics"
        data={kpis.clicks}
        format="number"
        compareMode={compareMode}
        sparkline={clicksSeries}
      />
      <KpiCard
        label="Conversiones"
        data={kpis.conversions}
        format="number"
        compareMode={compareMode}
        sparkline={conversionsSeries}
      />
    </div>
  );
}
