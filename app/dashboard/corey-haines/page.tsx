import { parseFilters } from "@/lib/filters";
import { fetchKpis } from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
import { CoreyHainesAnalysis } from "@/components/corey-haines-analysis";
import { EmptyStateBanner } from "@/components/empty-state-banner";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CoreyHainesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  // Necesitamos KPIs solo para detectar período sin datos. El reporte real
  // se genera del lado cliente vía /api/corey-haines.
  const kpis = await fetchKpis(filters);

  const hasPaidData =
    kpis.cost.current > 0 ||
    kpis.impressions.current > 0 ||
    kpis.clicks.current > 0 ||
    kpis.conversions.current > 0;

  const days = rangeDays(filters.from, filters.to);
  const compareLabel =
    filters.compare === "yoy"
      ? "comparado contra el mismo rango del año pasado"
      : filters.compare === "previous"
      ? `comparado contra los ${days} días previos`
      : "sin comparación";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
      <div>
        <p className="eyebrow-sm">Corey Haines · Reporte experto</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {formatHumanRange(filters.from, filters.to)}
        </h2>
        <p className="mt-1.5 text-sm text-steel">
          {days} {days === 1 ? "día" : "días"} · {compareLabel}
        </p>
      </div>

      {hasPaidData ? (
        <section aria-labelledby="corey-heading">
          <h3 id="corey-heading" className="sr-only">
            Reporte experto Corey Haines
          </h3>
          <CoreyHainesAnalysis filters={filters} />
        </section>
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
