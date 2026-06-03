import { parseFilters } from "@/lib/filters";
import {
  fetchCampaignAnomalies,
  fetchCampaignRows,
  fetchDailyByPublisher,
  fetchDailyTotals,
  fetchGa4Kpis,
  fetchKpis,
} from "@/lib/queries";
import {
  buildAlerts,
  buildEfficiencyPoints,
  buildFunnel,
  buildSpendDistribution,
} from "@/lib/insights";
import { rangeDays } from "@/lib/dates";
import { InlineFilters } from "@/components/inline-filters";
import { EmptyStateBanner } from "@/components/empty-state-banner";
import { HeadlineStrip } from "@/components/cockpit/headline-strip";
import { AlertFeed } from "@/components/cockpit/alert-feed";
import { FunnelChart } from "@/components/cockpit/funnel-chart";
import { SpendDistribution } from "@/components/cockpit/spend-distribution";
import { EfficiencyQuadrant } from "@/components/cockpit/efficiency-quadrant";
import { CostEvolutionChart } from "@/components/charts/cost-evolution";
import { AiAnalysis } from "@/components/ai-analysis";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CockpitPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [kpis, ga4Kpis, dailyPoints, dailyTotals, rows, anomalies] =
    await Promise.all([
      fetchKpis(filters),
      fetchGa4Kpis(filters),
      fetchDailyByPublisher(filters),
      fetchDailyTotals(filters),
      fetchCampaignRows(filters),
      fetchCampaignAnomalies(filters),
    ]);

  const hasPaidData =
    kpis.cost.current > 0 ||
    kpis.clicks.current > 0 ||
    kpis.conversions.current > 0 ||
    rows.length > 0;

  const days = rangeDays(filters.from, filters.to);
  const compareLabel =
    filters.compare === "yoy"
      ? "vs el mismo rango del año pasado"
      : filters.compare === "previous"
        ? `vs los ${days} días previos`
        : "sin comparación";

  // Derivaciones del cockpit
  const alerts = buildAlerts(rows, anomalies);
  const distribution = buildSpendDistribution(rows, anomalies);
  const funnel = buildFunnel(kpis);
  const efficiency = buildEfficiencyPoints(rows);

  const gadsCost = rows
    .filter((r) => r.publisher === "gads")
    .reduce((s, r) => s + r.cost, 0);
  const total = distribution.total;
  const split =
    total > 0
      ? `GAds ${Math.round((gadsCost / total) * 100)}% · Meta ${Math.round(
          ((total - gadsCost) / total) * 100,
        )}%`
      : undefined;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header>
        <div className="eyebrow-sm" style={{ color: "var(--color-plasma)" }}>
          Cockpit · cómo vamos y qué mirar
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {formatHumanRange(filters.from, filters.to)}
        </h1>
        <p className="mt-1.5 text-sm text-steel">
          {days} {days === 1 ? "día" : "días"} · {compareLabel} · Corte láser y
          plasma · Córdoba
        </p>
      </header>

      <InlineFilters />

      {hasPaidData ? (
        <>
          <HeadlineStrip
            kpis={kpis}
            ga4={ga4Kpis}
            daily={dailyTotals}
            compareMode={filters.compare}
          />

          <div className="grid grid-cols-12 gap-3 sm:gap-4">
            <div className="col-span-12 lg:col-span-8">
              <AlertFeed alerts={alerts} />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <FunnelChart stages={funnel} />
            </div>

            <div className="col-span-12 lg:col-span-5">
              <SpendDistribution data={distribution} right={split} />
            </div>
            <div className="col-span-12 lg:col-span-7">
              <EfficiencyQuadrant points={efficiency} />
            </div>

            <div className="col-span-12">
              <section aria-labelledby="trend-heading">
                <h2 id="trend-heading" className="sr-only">
                  Tendencia diaria de inversión
                </h2>
                <CostEvolutionChart
                  points={dailyPoints}
                  fromIso={filters.from}
                  toIso={filters.to}
                />
              </section>
            </div>

            <div className="col-span-12">
              <div className="surface-card overflow-hidden rounded-xl">
                <AiAnalysis filters={filters} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <EmptyStateBanner />
      )}
    </div>
  );
}

function formatHumanRange(from: string, to: string): string {
  const fmt = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const f = fmt.format(new Date(`${from}T00:00:00Z`));
  const t = fmt.format(new Date(`${to}T00:00:00Z`));
  return `${f} — ${t}`;
}
