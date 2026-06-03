import { parseFilters } from "@/lib/filters";
import { fetchGa4Kpis, fetchGa4SourceMedium } from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
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

  const days = rangeDays(filters.from, filters.to);
  const compareLabel =
    filters.compare === "yoy"
      ? "vs el mismo rango del año pasado"
      : filters.compare === "previous"
      ? `vs los ${days} días previos`
      : "sin comparación";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
      <div>
        <p className="eyebrow-sm">Tráfico del sitio</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {formatHumanRange(filters.from, filters.to)}
        </h2>
        <p className="mt-1.5 text-sm text-steel">
          Google Analytics 4 · {compareLabel}. Los filtros de campaña no
          aplican a esta vista (GA4 no diferencia tráfico pago vs orgánico).
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
