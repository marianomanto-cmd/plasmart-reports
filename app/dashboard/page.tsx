import Link from "next/link";
import { Sparkles } from "lucide-react";

import { parseFilters } from "@/lib/filters";
import {
  fetchCampaignRows,
  fetchDailyByPublisher,
  fetchDailyTotals,
  fetchGa4Kpis,
  fetchKpis,
} from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
import { KpiGrid } from "@/components/kpi-grid";
import { Ga4KpiGrid } from "@/components/ga4-kpi-grid";
import { CostEvolutionChart } from "@/components/charts/cost-evolution";
import { EmptyStateBanner } from "@/components/empty-state-banner";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [kpis, ga4Kpis, dailyPoints, dailyTotals, campaignRowsForCheck] =
    await Promise.all([
      fetchKpis(filters),
      fetchGa4Kpis(filters),
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
      <div>
        <p className="eyebrow-sm">Resumen del período</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {formatHumanRange(filters.from, filters.to)}
        </h2>
        <p className="mt-1.5 text-sm text-steel">
          {days} {days === 1 ? "día" : "días"} · {compareLabel}
        </p>
      </div>

      {hasPaidData ? (
        <>
          <section aria-labelledby="paid-kpis">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 id="paid-kpis" className="eyebrow-xs">
                Performance pagada
              </h3>
            </div>
            <KpiGrid
              kpis={kpis}
              compareMode={filters.compare}
              daily={dailyTotals}
            />
          </section>

          <section aria-labelledby="ga4-kpis">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 id="ga4-kpis" className="eyebrow-xs">
                Tráfico del sitio (GA4)
              </h3>
            </div>
            <Ga4KpiGrid kpis={ga4Kpis} compareMode={filters.compare} />
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

          {/* CTA al hub de análisis IA — vive en /dashboard/analysis */}
          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-brand" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-foreground">
                    ¿Necesitás un análisis?
                  </h3>
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-steel">
                  Generá un diagnóstico rápido o un reporte experto Corey
                  Haines del período actual desde el hub de análisis.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link href={withQs("/dashboard/analysis", filters)}>
                  Ir al análisis
                </Link>
              </Button>
            </div>
          </section>
        </>
      ) : (
        <EmptyStateBanner />
      )}
    </div>
  );
}

function withQs(href: string, filters: ReturnType<typeof parseFilters>): string {
  const qs = new URLSearchParams();
  qs.set("from", filters.from);
  qs.set("to", filters.to);
  if (filters.compare !== "previous") qs.set("compare", filters.compare);
  if (filters.publisher) qs.set("publisher", filters.publisher);
  if (filters.type) qs.set("type", filters.type);
  if (filters.campaignId) qs.set("campaign", filters.campaignId);
  return `${href}?${qs.toString()}`;
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
