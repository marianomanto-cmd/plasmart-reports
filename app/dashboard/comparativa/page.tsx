import { parseFilters } from "@/lib/filters";
import {
  fetchAvailableFilters,
  fetchGa4Kpis,
  fetchGa4SourceMedium,
  fetchPublisherComparison,
} from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
import { FiltersBar } from "@/components/filters-bar";
import { Ga4KpiGrid } from "@/components/ga4-kpi-grid";
import { Ga4SourceMediumTable } from "@/components/ga4-source-medium-table";
import { PublisherComparisonTable } from "@/components/publisher-comparison";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ComparativaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [available, ga4Kpis, ga4Rows, comparison] = await Promise.all([
    fetchAvailableFilters(filters.from, filters.to, filters.publisher),
    fetchGa4Kpis(filters),
    fetchGa4SourceMedium(filters.from, filters.to),
    fetchPublisherComparison(filters),
  ]);

  const days = rangeDays(filters.from, filters.to);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 px-8 py-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-light">
            Comparativa
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary">
            {formatHumanRange(filters.from, filters.to)}
          </h2>
          <p className="mt-1 text-sm text-steel">
            {days} {days === 1 ? "día" : "días"} · GAds vs Meta y tráfico de GA4
          </p>
        </div>

        <FiltersBar filters={filters} available={available} />

        <section aria-labelledby="comparison-heading">
          <h3 id="comparison-heading" className="sr-only">
            Comparativa GAds vs Meta
          </h3>
          <PublisherComparisonTable data={comparison} />
        </section>

        {/* GA4 — vivía antes en /dashboard, lo movemos acá */}
        <div className="pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-light">
            Tráfico del sitio
          </p>
          <h3 className="mt-1 text-xl font-bold tracking-tight text-primary">
            Google Analytics
          </h3>
          <p className="mt-1 text-sm text-steel">
            Mismo rango de fechas. Los filtros de campaña no aplican a GA4.
          </p>
        </div>

        <Ga4KpiGrid kpis={ga4Kpis} compareMode={filters.compare} />
        <Ga4SourceMediumTable rows={ga4Rows} />
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
