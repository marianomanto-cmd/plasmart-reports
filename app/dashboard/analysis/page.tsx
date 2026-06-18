import { parseFilters } from "@/lib/filters";
import { fetchKpis } from "@/lib/queries";
import { AnalysisHub } from "@/components/analysis-hub";
import { EmptyStateBanner } from "@/components/empty-state-banner";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  // Detectar si hay datos en el período (igual que las otras pages que
  // usan análisis IA).
  const kpis = await fetchKpis(filters);
  const hasPaidData =
    kpis.cost.current > 0 ||
    kpis.impressions.current > 0 ||
    kpis.clicks.current > 0 ||
    kpis.conversions.current > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5 lg:px-8">
      {hasPaidData ? (
        <AnalysisHub filters={filters} />
      ) : (
        <EmptyStateBanner />
      )}
    </div>
  );
}
