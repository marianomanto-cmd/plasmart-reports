import { parseFilters } from "@/lib/filters";
import {
  fetchAdRows,
  fetchAdsetRows,
  fetchCampaignAnomalies,
  fetchCampaignRows,
  fetchPublisherComparison,
} from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
import { GranularityPills } from "@/components/granularity-pills";
import { PublisherComparisonTable } from "@/components/publisher-comparison";
import { TopCampaignsChart } from "@/components/charts/top-campaigns";
import { TopAdsetsChart } from "@/components/charts/top-adsets";
import { TopAdsChart } from "@/components/charts/top-ads";
import { CampaignTable } from "@/components/campaign-table";
import { AdsetTable } from "@/components/adset-table";
import { AdTable } from "@/components/ad-table";
import { EmptyStateBanner } from "@/components/empty-state-banner";
import type { AnalysisGranularity, DashboardFilters, Publisher } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseGranularity(
  raw: string | string[] | undefined,
): AnalysisGranularity {
  const v = Array.isArray(raw) ?  raw[0] : raw;
  if (v === "adset" || v === "ad") return v;
  return "campaign";
}

interface PaidViewProps {
  /** Si se setea, fuerza el publisher para esta vista (usado por las sub-rutas
   *  /paid/gads y /paid/meta). Si no, respeta el publisher de la URL. */
  forcePublisher?: Publisher;
  /** Eyebrow + subtitle de la página, varía según la sub-ruta. */
  eyebrow: string;
  subtitle?: string;
}

/**
 * Vista unificada de "Paid": comparativa por publisher + drill-down por
 * granularidad. Sirve para /paid (todos los publishers), /paid/gads y
 * /paid/meta — las dos últimas inyectan `forcePublisher`.
 */
export async function PaidView({
  searchParams,
  forcePublisher,
  eyebrow,
  subtitle,
}: {
  searchParams: SearchParams;
  forcePublisher?: Publisher;
  eyebrow: string;
  subtitle?: string;
}) {
  const params = await searchParams;
  const baseFilters = parseFilters(params);
  const filters: DashboardFilters = forcePublisher
    ? { ...baseFilters, publisher: forcePublisher }
    : baseFilters;
  const granularity = parseGranularity(params.granularity);
  const days = rangeDays(filters.from, filters.to);

  // Comparativa se omite si forzamos publisher (no tiene sentido comparar
  // GAds vs Meta en una vista filtrada a uno solo).
  const showComparison = !forcePublisher;

  const comparisonPromise = showComparison
    ? fetchPublisherComparison(filters)
    : Promise.resolve(null);

  if (granularity === "adset") {
    const [comparison, adsetRows] = await Promise.all([
      comparisonPromise,
      fetchAdsetRows(filters),
    ]);

    return (
      <PaidShell
        eyebrow={eyebrow}
        subtitle={subtitle ?? defaultSubtitle(days, granularity)}
        filters={filters}
        granularity={granularity}
      >
        {comparison && <PublisherComparisonTable data={comparison} />}
        {adsetRows.length > 0 ? (
          <>
            <TopAdsetsChart rows={adsetRows.slice(0, 10)} />
            <AdsetTable rows={adsetRows} />
          </>
        ) : (
          <NoDrillDownBanner level="adset" publisher={filters.publisher ?? null} />
        )}
      </PaidShell>
    );
  }

  if (granularity === "ad") {
    const [comparison, adRows] = await Promise.all([
      comparisonPromise,
      fetchAdRows(filters),
    ]);

    return (
      <PaidShell
        eyebrow={eyebrow}
        subtitle={subtitle ?? defaultSubtitle(days, granularity)}
        filters={filters}
        granularity={granularity}
      >
        {comparison && <PublisherComparisonTable data={comparison} />}
        {adRows.length > 0 ? (
          <>
            <TopAdsChart rows={adRows.slice(0, 10)} />
            <AdTable rows={adRows} />
          </>
        ) : (
          <NoDrillDownBanner level="ad" publisher={filters.publisher ?? null} />
        )}
      </PaidShell>
    );
  }

  // Granularidad por default: campañas
  const [comparison, allCampaignRows, anomalies] = await Promise.all([
    comparisonPromise,
    fetchCampaignRows(filters),
    fetchCampaignAnomalies(filters),
  ]);

  return (
    <PaidShell
      eyebrow={eyebrow}
      subtitle={subtitle ?? defaultSubtitle(days, granularity)}
      filters={filters}
      granularity={granularity}
    >
      {comparison && <PublisherComparisonTable data={comparison} />}
      {allCampaignRows.length > 0 ? (
        <>
          <TopCampaignsChart rows={allCampaignRows.slice(0, 10)} />
          <CampaignTable rows={allCampaignRows} anomalies={anomalies} />
        </>
      ) : (
        <EmptyStateBanner />
      )}
    </PaidShell>
  );
}

function PaidShell({
  eyebrow,
  subtitle,
  filters,
  granularity,
  children,
}: {
  eyebrow: string;
  subtitle: string;
  filters: DashboardFilters;
  granularity: AnalysisGranularity;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
      <div>
        <p className="eyebrow-sm">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {formatHumanRange(filters.from, filters.to)}
        </h2>
        <p className="mt-1.5 text-sm text-steel">{subtitle}</p>
      </div>

      <GranularityPills current={granularity} />

      {children}
    </div>
  );
}

function NoDrillDownBanner({
  level,
  publisher,
}: {
  level: "adset" | "ad";
  publisher: Publisher | null;
}) {
  const levelLabel = level === "adset" ? "ad groups" : "ads";
  const isMeta = publisher === "meta";

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-10 text-center sm:px-8 sm:py-12">
      <p className="eyebrow-xs">Sin datos a este nivel</p>
      <h3 className="mt-3 text-xl font-bold tracking-tight text-foreground">
        No hay {levelLabel} para el período y filtros seleccionados
      </h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-steel">
        {isMeta ? (
          <>
            Meta Ads todavía no exporta {levelLabel} al dashboard. Cambiá el
            filtro de publisher a Google Ads o quitalo para ver lo disponible.
          </>
        ) : (
          <>
            Puede que el script de Google Ads que exporta {levelLabel}{" "}
            todavía no haya corrido para este rango. Probá ampliar el rango
            o esperar a la próxima corrida semanal.
          </>
        )}
      </p>
    </div>
  );
}

function defaultSubtitle(days: number, granularity: AnalysisGranularity): string {
  const period = `${days} ${days === 1 ? "día" : "días"}`;
  const level =
    granularity === "campaign"
      ? "campaña por campaña"
      : granularity === "adset"
      ? "ad group por ad group"
      : "ad por ad";
  return `${period} · ${level}`;
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

// ---------- Page exports ----------

export default async function PaidPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <PaidView
      searchParams={searchParams}
      eyebrow="Performance pagada"
    />
  );
}
