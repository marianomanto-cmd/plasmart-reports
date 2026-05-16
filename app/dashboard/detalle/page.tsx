import { parseFilters } from "@/lib/filters";
import {
  fetchAdRows,
  fetchAdsetRows,
  fetchCampaignAnomalies,
  fetchCampaignRows,
} from "@/lib/queries";
import { rangeDays } from "@/lib/dates";
import { GranularityPills } from "@/components/granularity-pills";
import { TopCampaignsChart } from "@/components/charts/top-campaigns";
import { TopAdsetsChart } from "@/components/charts/top-adsets";
import { TopAdsChart } from "@/components/charts/top-ads";
import { CampaignTable } from "@/components/campaign-table";
import { AdsetTable } from "@/components/adset-table";
import { AdTable } from "@/components/ad-table";
import { EmptyStateBanner } from "@/components/empty-state-banner";
import type { AnalysisGranularity } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseGranularity(
  raw: string | string[] | undefined,
): AnalysisGranularity {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "adset" || v === "ad") return v;
  return "campaign";
}

export default async function DetallePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const granularity = parseGranularity(params.granularity);
  const days = rangeDays(filters.from, filters.to);

  // Branch según granularidad: traemos sólo lo que la vista necesita.
  if (granularity === "adset") {
    const adsetRows = await fetchAdsetRows(filters);

    return (
      <DetallePageShell
        filters={filters}
        days={days}
        granularity={granularity}
        eyebrow="Detalle de ad groups"
        subtitle={
          adsetRows.length > 0
            ? `${days} ${days === 1 ? "día" : "días"} · ad group por ad group`
            : `${days} ${days === 1 ? "día" : "días"} · sin datos a este nivel`
        }
      >
        {adsetRows.length > 0 ? (
          <>
            <section aria-labelledby="top-heading">
              <h3 id="top-heading" className="sr-only">
                Top ad groups por inversión
              </h3>
              <TopAdsetsChart rows={adsetRows.slice(0, 10)} />
            </section>
            <section aria-labelledby="table-heading">
              <h3 id="table-heading" className="sr-only">
                Tabla detalle de ad groups
              </h3>
              <AdsetTable rows={adsetRows} />
            </section>
          </>
        ) : (
          <NoDrillDownBanner level="adset" publisher={filters.publisher ?? null} />
        )}
      </DetallePageShell>
    );
  }

  if (granularity === "ad") {
    const adRows = await fetchAdRows(filters);

    return (
      <DetallePageShell
        filters={filters}
        days={days}
        granularity={granularity}
        eyebrow="Detalle de ads"
        subtitle={
          adRows.length > 0
            ? `${days} ${days === 1 ? "día" : "días"} · ad por ad`
            : `${days} ${days === 1 ? "día" : "días"} · sin datos a este nivel`
        }
      >
        {adRows.length > 0 ? (
          <>
            <section aria-labelledby="top-heading">
              <h3 id="top-heading" className="sr-only">
                Top ads por inversión
              </h3>
              <TopAdsChart rows={adRows.slice(0, 10)} />
            </section>
            <section aria-labelledby="table-heading">
              <h3 id="table-heading" className="sr-only">
                Tabla detalle de ads
              </h3>
              <AdTable rows={adRows} />
            </section>
          </>
        ) : (
          <NoDrillDownBanner level="ad" publisher={filters.publisher ?? null} />
        )}
      </DetallePageShell>
    );
  }

  // ---- Granularidad por default: campañas ----
  const [allCampaignRows, anomalies] = await Promise.all([
    fetchCampaignRows(filters),
    fetchCampaignAnomalies(filters),
  ]);

  const top10 = allCampaignRows.slice(0, 10);
  const hasData = allCampaignRows.length > 0;

  return (
    <DetallePageShell
      filters={filters}
      days={days}
      granularity={granularity}
      eyebrow="Detalle de campañas"
      subtitle={`${days} ${days === 1 ? "día" : "días"} · campaña por campaña`}
    >
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
    </DetallePageShell>
  );
}

// ---------- Sub-componentes locales ----------

function DetallePageShell({
  filters,
  granularity,
  eyebrow,
  subtitle,
  children,
}: {
  filters: ReturnType<typeof parseFilters>;
  days: number;
  granularity: AnalysisGranularity;
  eyebrow: string;
  subtitle: string;
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
  publisher: "gads" | "meta" | null;
}) {
  const levelLabel = level === "adset" ? "ad groups" : "ads";
  const isMeta = publisher === "meta";

  return (
    <div className="border border-border-default bg-white px-4 py-10 text-center sm:px-8 sm:py-12">
      <p className="eyebrow-xs">Sin datos a este nivel</p>
      <h3 className="mt-3 text-xl font-bold tracking-tight text-foreground">
        No hay {levelLabel} para el período y filtros seleccionados
      </h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-steel">
        {isMeta ? (
          <>
            Meta Ads todavía no exporta {levelLabel} al dashboard. Mientras
            tanto, cambiá el filtro de publisher a Google Ads o quitalo para
            ver lo disponible.
          </>
        ) : (
          <>
            Puede que el script de Google Ads que exporta {levelLabel}{" "}
            todavía no haya corrido para este rango, o que el período sea
            anterior a la fecha en que se activó la ingesta. Probá ampliar
            el rango o esperar a la próxima corrida semanal.
          </>
        )}
      </p>
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
