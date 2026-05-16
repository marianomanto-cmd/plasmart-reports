import { parseFilters } from "@/lib/filters";
import {
  fetchGa4Kpis,
  fetchGa4SourceMedium,
  fetchPublisherComparison,
} from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
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

  const [ga4Kpis, ga4Rows, comparison] = await Promise.all([
    fetchGa4Kpis(filters),
    fetchGa4SourceMedium(filters.from, filters.to),
    fetchPublisherComparison(filters),
  ]);

  const days = rangeDays(filters.from, filters.to);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
      <div>
        <p className="eyebrow-sm">Comparativa</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {formatHumanRange(filters.from, filters.to)}
        </h2>
        <p className="mt-1.5 text-sm text-steel">
          {days} {days === 1 ? "día" : "días"} · GAds vs Meta y tráfico de GA4
        </p>
      </div>

      <section aria-labelledby="comparison-heading">
        <h3 id="comparison-heading" className="sr-only">
          Comparativa GAds vs Meta
        </h3>
        <PublisherComparisonTable data={comparison} />
      </section>

      <div className="pt-4">
        <p className="eyebrow-sm">Tráfico del sitio</p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Google Analytics
        </h3>
        <p className="mt-1.5 text-sm text-steel">
          Mismo rango de fechas. Los filtros de campaña no aplican a GA4.
        </p>
      </div>

      <Ga4KpiGrid kpis={ga4Kpis} compareMode={filters.compare} />
      <Ga4SourceMediumTable rows={ga4Rows} />
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
