import { parseFilters } from "@/lib/filters";
import { fetchGa4Kpis, fetchGa4SourceMedium } from "@/lib/queries";
import { Ga4KpiGrid } from "@/components/ga4-kpi-grid";
import { Ga4SourceMediumTable } from "@/components/ga4-source-medium-table";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrafficPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [ga4Kpis, ga4Rows] = await Promise.all([
    fetchGa4Kpis(filters),
    fetchGa4SourceMedium(filters.from, filters.to),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5 lg:px-8">
      <p className="text-xs text-light">
        GA4 no diferencia tráfico pago vs orgánico — los filtros de campaña no
        aplican a esta vista.
      </p>

      <Ga4KpiGrid kpis={ga4Kpis} compareMode={filters.compare} />
      <Ga4SourceMediumTable rows={ga4Rows} />
    </div>
  );
}
