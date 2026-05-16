import type { PublisherComparison, PublisherTotals } from "@/lib/types";
import {
  formatCurrencyArs,
  formatInteger,
  formatRatioAsPct,
} from "@/lib/format";
import { Card } from "@/components/tremor/card";

interface Props {
  data: PublisherComparison;
}

interface MetricRow {
  label: string;
  gads: string;
  meta: string;
  total: string;
  emphasis?: boolean;
}

interface ShareMetric {
  label: string;
  gadsShare: number | null;
  metaShare: number | null;
}

/**
 * Tabla comparativa GAds vs Meta.
 *
 * Desktop: tabla de 4 columnas (métrica + 2 publishers + total).
 * Mobile: dos cards (una por publisher) con todas las métricas en
 * forma de definition list — evita scroll horizontal por completo.
 */
export function PublisherComparisonTable({ data }: Props) {
  const { gads, meta, totals } = data;

  if (!gads && !meta) {
    return (
      <Card className="p-12 text-center">
        <p className="eyebrow-xs">Comparativa GAds vs Meta</p>
        <p className="mt-3 text-sm text-light">
          Sin datos en el rango y filtros seleccionados.
        </p>
      </Card>
    );
  }

  const metrics: MetricRow[] = [
    {
      label: "Inversión",
      gads: gads ? formatCurrencyArs(gads.cost) : "—",
      meta: meta ? formatCurrencyArs(meta.cost) : "—",
      total: formatCurrencyArs(totals.cost),
      emphasis: true,
    },
    {
      label: "Conversiones",
      gads: gads ? formatInteger(gads.conversions) : "—",
      meta: meta ? formatInteger(meta.conversions) : "—",
      total: formatInteger(totals.conversions),
      emphasis: true,
    },
    {
      label: "CPA",
      gads: renderCpa(gads),
      meta: renderCpa(meta),
      total: "—",
    },
    {
      label: "CTR",
      gads: gads ? formatRatioAsPct(gads.ctr) : "—",
      meta: meta ? formatRatioAsPct(meta.ctr) : "—",
      total: "—",
    },
    {
      label: "CPC",
      gads: gads ? formatCurrencyArs(gads.cpc) : "—",
      meta: meta ? formatCurrencyArs(meta.cpc) : "—",
      total: "—",
    },
    {
      label: "CPM",
      gads: gads ? formatCurrencyArs(gads.cpm) : "—",
      meta: meta ? formatCurrencyArs(meta.cpm) : "—",
      total: "—",
    },
  ];

  const shares: ShareMetric[] = [
    {
      label: "Share del gasto",
      gadsShare: gads?.spendShare ?? null,
      metaShare: meta?.spendShare ?? null,
    },
    {
      label: "Share de conversiones",
      gadsShare: gads?.conversionShare ?? null,
      metaShare: meta?.conversionShare ?? null,
    },
  ];

  return (
    <Card className="p-0">
      <div className="border-b border-border-default px-4 py-4 sm:px-6">
        <h3 className="eyebrow-xs">Comparativa GAds vs Meta</h3>
        <p className="mt-1 text-[11px] text-light">
          Mismo rango de fechas. Refleja los filtros de tipo y campaña aplicados.
        </p>
      </div>

      {/* Mobile: cards apiladas + barras de share */}
      <div className="space-y-4 p-4 sm:hidden">
        <div className="space-y-3">
          {shares.map((s) => (
            <MobileShareRow key={s.label} share={s} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MobilePublisherCard
            label="Google Ads"
            accent="bg-[var(--color-gads)]"
            totals={gads}
            metrics={metrics.map((m) => ({ label: m.label, value: m.gads, emphasis: m.emphasis }))}
          />
          <MobilePublisherCard
            label="Meta Ads"
            accent="bg-[var(--color-meta)]"
            totals={meta}
            metrics={metrics.map((m) => ({ label: m.label, value: m.meta, emphasis: m.emphasis }))}
          />
        </div>
      </div>

      {/* Desktop: tabla tradicional */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-[10px] uppercase tracking-[0.18em] text-light">
              <th className="px-6 py-3 text-left font-semibold w-[28%]">
                Métrica
              </th>
              <th className="px-6 py-3 text-right font-semibold">
                Google Ads
              </th>
              <th className="px-6 py-3 text-right font-semibold">
                Meta Ads
              </th>
              <th className="px-6 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <Row {...metrics[0]} />
            <ShareRow label={shares[0].label} gadsShare={shares[0].gadsShare} metaShare={shares[0].metaShare} />
            <Row {...metrics[1]} />
            <ShareRow label={shares[1].label} gadsShare={shares[1].gadsShare} metaShare={shares[1].metaShare} />
            {metrics.slice(2).map((m) => (
              <Row key={m.label} {...m} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------- Mobile ----------

function MobilePublisherCard({
  label,
  accent,
  totals,
  metrics,
}: {
  label: string;
  accent: string;
  totals: PublisherTotals | null;
  metrics: Array<{ label: string; value: string; emphasis?: boolean }>;
}) {
  return (
    <div className="border border-border-default bg-white p-3">
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden="true" className={`h-2 w-2 ${accent}`} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          {label}
        </p>
      </div>
      {!totals ? (
        <p className="py-4 text-center text-xs text-light">Sin datos</p>
      ) : (
        <dl className="space-y-2">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-baseline justify-between gap-2">
              <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-light">
                {m.label}
              </dt>
              <dd
                className={`text-xs tabular-nums ${
                  m.emphasis ? "font-bold text-primary" : "text-steel"
                }`}
              >
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function MobileShareRow({ share }: { share: ShareMetric }) {
  const gadsPct = share.gadsShare !== null ? share.gadsShare * 100 : 0;
  const metaPct = share.metaShare !== null ? share.metaShare * 100 : 0;
  const hasGads = share.gadsShare !== null;
  const hasMeta = share.metaShare !== null;

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-light">
        {share.label}
      </p>
      <div className="flex h-2 w-full overflow-hidden bg-border-soft">
        {hasGads && (
          <div
            className="bg-[var(--color-gads)]"
            style={{ width: `${gadsPct}%` }}
            aria-label={`Google Ads ${gadsPct.toFixed(0)}%`}
          />
        )}
        {hasMeta && (
          <div
            className="bg-[var(--color-meta)]"
            style={{ width: `${metaPct}%` }}
            aria-label={`Meta Ads ${metaPct.toFixed(0)}%`}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-steel">
        <span>
          GAds {hasGads ? `${gadsPct.toFixed(0)}%` : "—"}
        </span>
        <span>
          Meta {hasMeta ? `${metaPct.toFixed(0)}%` : "—"}
        </span>
      </div>
    </div>
  );
}

// ---------- Desktop sub-componentes ----------

function Row({
  label,
  gads,
  meta,
  total,
  emphasis = false,
}: MetricRow) {
  return (
    <tr className="border-b border-border-default/60 last:border-0">
      <td className="px-6 py-4 text-[11px] font-medium uppercase tracking-[0.12em] text-steel">
        {label}
      </td>
      <td
        className={`px-6 py-4 text-right tabular-nums ${
          emphasis ? "font-semibold text-primary" : "text-steel"
        }`}
      >
        {gads}
      </td>
      <td
        className={`px-6 py-4 text-right tabular-nums ${
          emphasis ? "font-semibold text-primary" : "text-steel"
        }`}
      >
        {meta}
      </td>
      <td className="px-6 py-4 text-right text-light tabular-nums">{total}</td>
    </tr>
  );
}

function ShareRow({
  label,
  gadsShare,
  metaShare,
}: {
  label: string;
  gadsShare: number | null;
  metaShare: number | null;
}) {
  const gadsPct = gadsShare !== null ? gadsShare * 100 : 0;
  const metaPct = metaShare !== null ? metaShare * 100 : 0;

  return (
    <tr className="border-b border-border-default/60 last:border-0 bg-cream/30">
      <td className="px-6 py-4 text-[11px] font-medium uppercase tracking-[0.12em] text-steel">
        {label}
      </td>
      <td className="px-6 py-4 text-right tabular-nums text-steel">
        <ShareCell pct={gadsPct} hasData={gadsShare !== null} colorClass="bg-[var(--color-gads)]" />
      </td>
      <td className="px-6 py-4 text-right tabular-nums text-steel">
        <ShareCell pct={metaPct} hasData={metaShare !== null} colorClass="bg-[var(--color-meta)]" />
      </td>
      <td className="px-6 py-4 text-right text-light tabular-nums">—</td>
    </tr>
  );
}

function ShareCell({
  pct,
  hasData,
  colorClass,
}: {
  pct: number;
  hasData: boolean;
  colorClass: string;
}) {
  if (!hasData) {
    return <span className="text-light">—</span>;
  }
  return (
    <div className="flex items-center justify-end gap-3">
      <div className="relative h-2 w-24 bg-border-soft">
        <div
          className={`absolute inset-y-0 left-0 ${colorClass}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="font-semibold text-primary min-w-[42px]">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function renderCpa(p: PublisherTotals | null): string {
  if (!p) return "—";
  if (p.conversions === 0) return "—";
  return formatCurrencyArs(p.cpa);
}
