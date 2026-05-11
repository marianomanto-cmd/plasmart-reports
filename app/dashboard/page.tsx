import { parseFilters } from "@/lib/filters";
import {
  fetchAvailableFilters,
  fetchCampaignRows,
  fetchDailyByPublisher,
  fetchDailyTotals,
  fetchKpis,
} from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
import { FiltersBar } from "@/components/filters-bar";
import { KpiGrid } from "@/components/kpi-grid";
import { CostEvolutionChart } from "@/components/charts/cost-evolution";
import { AiAnalysis } from "@/components/ai-analysis";
import { EmptyStateBanner } from "@/components/empty-state-banner";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  // Necesitamos campaign rows solo para el detector de "sin datos"
  // (sin la tabla en sí, eso vive en /detalle).
  const [kpis, available, dailyPoints, dailyTotals, campaignRowsForCheck] =
    await Promise.all([
      fetchKpis(filters),
      fetchAvailableFilters(filters.from, filters.to, filters.publisher),
      fetchDailyByPublisher(filters),
      fetchDailyTotals(filters),
      fetchCampaignRows(filters, 1),
    ]);

  const hasPaidData =
    kpis.cost.current > 0 ||
    kpis.impressions.current > 0 ||
    kpis.clicks.current > 0 ||
    kpis.conversions.current > 0 ||
    campaignRowsForCheck.length > 0;

  const days = rangeDays(filters.from, filters.to);
  const compareLabel =
    filters.compare === "yoy"
      ? "comparado contra el mismo rango del año pasado"
      : filters.compare === "previous"
      ? `comparado contra los ${days} días previos`
      : "sin comparación";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-light">
            Resumen del período
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary">
            {formatHumanRange(filters.from, filters.to)}
          </h2>
          <p className="mt-1 text-sm text-steel">
            {days} {days === 1 ? "día" : "días"} · {compareLabel}
          </p>
        </div>

        <FiltersBar filters={filters} available={available} />

        {hasPaidData ? (
          <>
            <section aria-labelledby="kpis-heading">
              <h3 id="kpis-heading" className="sr-only">
                Indicadores principales
              </h3>
              <KpiGrid
                kpis={kpis}
                compareMode={filters.compare}
                daily={dailyTotals}
              />
            </section>

            <section aria-labelledby="evolution-heading">
              <h3 id="evolution-heading" className="sr-only">
                Evolución diaria de inversión
              </h3>
              <CostEvolutionChart
                points={dailyPoints}
                fromIso={filters.from}
                toIso={filters.to}
              />
            </section>

            {/* Análisis de Claude — sube de posición: ahora está
                inmediatamente debajo del gráfico de evolución, no al final. */}
            <section aria-labelledby="ai-heading">
              <h3 id="ai-heading" className="sr-only">
                Análisis automático de Claude
              </h3>
              <AiAnalysis filters={filters} />
            </section>
          </>
        ) : (
          <EmptyStateBanner />
        )}
      </div>
    </main>
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
