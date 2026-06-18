import { parseFilters } from "@/lib/filters";
import {
  fetchCampaignAnomalies,
  fetchCampaignRows,
  fetchDailyTotals,
  fetchKpis,
} from "@/lib/queries";
import { buildAlerts } from "@/lib/insights";
import { rangeDays } from "@/lib/dates";
import { EmptyStateBanner } from "@/components/empty-state-banner";
import { KpiStrip } from "@/components/cockpit/kpi-strip";
import { DailyBars } from "@/components/cockpit/daily-bars";
import { MiniStats } from "@/components/cockpit/mini-stats";
import { SpendDonut } from "@/components/cockpit/spend-donut";
import { AlertFeed } from "@/components/cockpit/alert-feed";
import { WeekCalendar } from "@/components/cockpit/week-calendar";
import { PeriodResult } from "@/components/cockpit/period-result";
import { AiAnalysis } from "@/components/ai-analysis";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CockpitPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [kpis, dailyTotals, rows, anomalies] = await Promise.all([
    fetchKpis(filters),
    fetchDailyTotals(filters),
    fetchCampaignRows(filters),
    fetchCampaignAnomalies(filters),
  ]);

  const hasPaidData =
    kpis.cost.current > 0 ||
    kpis.clicks.current > 0 ||
    kpis.conversions.current > 0 ||
    rows.length > 0;

  const alerts = buildAlerts(rows, anomalies);
  const days = rangeDays(filters.from, filters.to);

  // Reparto de inversión GAds vs Meta (derivado de las filas de campaña).
  const gadsCost = rows
    .filter((r) => r.publisher === "gads")
    .reduce((s, r) => s + r.cost, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const metaCost = totalCost - gadsCost;

  const cpaCombined =
    kpis.conversions.current > 0
      ? kpis.cost.current / kpis.conversions.current
      : null;
  const cpaPrev =
    kpis.cost.previous !== null &&
    kpis.conversions.previous !== null &&
    kpis.conversions.previous > 0
      ? kpis.cost.previous / kpis.conversions.previous
      : null;
  const cpaDeltaPct =
    cpaCombined !== null && cpaPrev !== null && cpaPrev !== 0
      ? ((cpaCombined - cpaPrev) / cpaPrev) * 100
      : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 px-4 py-4 sm:space-y-4 sm:px-6 sm:py-5 lg:px-8">
      {hasPaidData ? (
        <>
          <KpiStrip kpis={kpis} compareMode={filters.compare} />

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.35fr_0.85fr_1.2fr]">
            <DailyBars daily={dailyTotals} />
            <MiniStats kpis={kpis} />
            <SpendDonut
              gadsCost={gadsCost}
              metaCost={metaCost}
              cpaCombined={cpaCombined}
              cpaDeltaPct={cpaDeltaPct}
            />
          </div>

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.45fr_1fr]">
            <AlertFeed alerts={alerts} />
            <div className="flex flex-col gap-3 sm:gap-4">
              <WeekCalendar />
              <PeriodResult kpis={kpis} days={days} />
            </div>
          </div>

          <div className="surface-card overflow-hidden rounded-[22px]">
            <AiAnalysis filters={filters} />
          </div>
        </>
      ) : (
        <EmptyStateBanner />
      )}
    </div>
  );
}
