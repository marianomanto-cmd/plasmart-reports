import { parseFilters } from "@/lib/filters";
import {
  fetchAvailableFilters,
  fetchCampaignAnomalies,
  fetchCampaignRows,
} from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
import { FiltersBar } from "@/components/filters/filters-bar";
import { TopCampaignsChart } from "@/components/charts/top-campaigns";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import { EmptyStateBanner } from "@/components/ui/empty-state-banner";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DetallePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [available, allCampaignRows, anomalies] = await Promise.all([
    fetchAvailableFilters(filters.from, filters.to, filters.publisher),
    fetchCampaignRows(filters),
    fetchCampaignAnomalies(filters),
  ]);

  const top10 = allCampaignRows.slice(0, 10);
  const hasData = allCampaignRows.length > 0;

  const days = rangeDays(filters.from, filters.to);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 px-8 py-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-light">
            Detalle de campañas
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary">
            {formatHumanRange(filters.from, filters.to)}
          </h2>
          <p className="mt-1 text-sm text-steel">
            {days} {days === 1 ? "día" : "días"} · campaña por campaña
          </p>
        </div>

        <FiltersBar filters={filters} available={available} />

        {hasData ? (
          <>
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
              <CampaignTable rows={allCampaignRows} anomalies={anomalies} />
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
