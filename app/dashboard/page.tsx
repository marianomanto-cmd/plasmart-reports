import { createClient } from "@/lib/supabase/server";
import { parseFilters } from "@/lib/filters";
import {
  fetchAvailableFilters,
  fetchCampaignRows,
  fetchDailyByPublisher,
  fetchGa4Kpis,
  fetchGa4SourceMedium,
  fetchKpis,
} from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
import { DashboardHeader } from "@/components/dashboard-header";
import { FiltersBar } from "@/components/filters-bar";
import { KpiGrid } from "@/components/kpi-grid";
import { CostEvolutionChart } from "@/components/charts/cost-evolution";
import { TopCampaignsChart } from "@/components/charts/top-campaigns";
import { CampaignTable } from "@/components/campaign-table";
import { Ga4KpiGrid } from "@/components/ga4-kpi-grid";
import { Ga4SourceMediumTable } from "@/components/ga4-source-medium-table";
import { AiAnalysis } from "@/components/ai-analysis";
import { EmptyStateBanner } from "@/components/empty-state-banner";

// Next 16: searchParams llega como Promise
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    kpis,
    available,
    dailyPoints,
    allCampaignRows,
    ga4Kpis,
    ga4Rows,
  ] = await Promise.all([
    fetchKpis(filters),
    fetchAvailableFilters(filters.from, filters.to, filters.publisher),
    fetchDailyByPublisher(filters),
    fetchCampaignRows(filters),
    fetchGa4Kpis(filters),
    fetchGa4SourceMedium(filters.from, filters.to),
  ]);

  const top10 = allCampaignRows.slice(0, 10);

  // Detectar "sin datos de campañas pagas para los filtros aplicados".
  // Si los 4 KPIs son cero Y no hay filas de campañas, mostramos el banner
  // en lugar de la sección entera de campañas. La sección GA4 sigue visible.
  const hasPaidData =
    kpis.cost.current > 0 ||
    kpis.impressions.current > 0 ||
    kpis.clicks.current > 0 ||
    kpis.conversions.current > 0 ||
    allCampaignRows.length > 0;

  const days = rangeDays(filters.from, filters.to);
  const compareLabel =
    filters.compare === "yoy"
      ? "comparado contra el mismo rango del año pasado"
      : filters.compare === "previous"
      ? `comparado contra los ${days} días previos`
      : "sin comparación";

  return (
    <main className="min-h-screen bg-background">
      <DashboardHeader userEmail={user?.email} active="dashboard" />

      <div className="mx-auto max-w-7xl space-y-8 px-8 py-8">
        {/* Encabezado del reporte */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-light">
            Reporte de campañas
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary">
            {formatHumanRange(filters.from, filters.to)}
          </h2>
          <p className="mt-1 text-sm text-steel">
            {days} {days === 1 ? "día" : "días"} · {compareLabel}
          </p>
        </div>

        {/* Filtros sticky */}
        <FiltersBar filters={filters} available={available} />

        {/* ============== Bloque 1: campañas pagas ============== */}

        {hasPaidData ? (
          <>
            <section aria-labelledby="kpis-heading">
              <h3 id="kpis-heading" className="sr-only">
                Indicadores de campañas pagas
              </h3>
              <KpiGrid kpis={kpis} compareMode={filters.compare} />
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

            <section aria-labelledby="top-heading">
              <h3 id="top-heading" className="sr-only">
                Top campañas por inversión
              </h3>
              <TopCampaignsChart rows={top10} />
            </section>

            <section aria-labelledby="table-heading">
              <h3 id="table-heading" className="sr-only">
                Tabla detalle de campañas
              </h3>
              <CampaignTable rows={allCampaignRows} />
            </section>
          </>
        ) : (
          <EmptyStateBanner />
        )}

        {/* ============== Separador entre secciones ============== */}

        <div className="pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-light">
            Tráfico del sitio
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary">
            Google Analytics
          </h2>
          <p className="mt-1 text-sm text-steel">
            Mismo rango de fechas. Los filtros de campaña no aplican a GA4.
          </p>
        </div>

        {/* ============== Bloque 2: GA4 ============== */}

        <section aria-labelledby="ga4-kpis-heading">
          <h3 id="ga4-kpis-heading" className="sr-only">
            Indicadores de GA4
          </h3>
          <Ga4KpiGrid kpis={ga4Kpis} compareMode={filters.compare} />
        </section>

        <section aria-labelledby="ga4-table-heading">
          <h3 id="ga4-table-heading" className="sr-only">
            Tráfico por fuente y medio
          </h3>
          <Ga4SourceMediumTable rows={ga4Rows} />
        </section>

        {/* ============== Bloque 3: análisis de Claude ============== */}

        <section aria-labelledby="ai-heading" className="pt-4">
          <h3 id="ai-heading" className="sr-only">
            Análisis automático de Claude
          </h3>
          <AiAnalysis filters={filters} />
        </section>
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
