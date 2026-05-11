import type { PublisherComparison, PublisherTotals } from "@/lib/types";
import {
  formatCurrencyArs,
  formatInteger,
  formatRatioAsPct,
} from "@/lib/format";

interface Props {
  data: PublisherComparison;
}

/**
 * Tabla comparativa GAds vs Meta. 8 métricas en filas, 2 publishers
 * + total en columnas. Las dos filas de "share" tienen una barra
 * horizontal visual para que la distribución se entienda al toque.
 *
 * Server Component: solo render, sin interacción.
 */
export function PublisherComparisonTable({ data }: Props) {
  const { gads, meta, totals } = data;

  if (!gads && !meta) {
    return (
      <div className="border border-border-default bg-white p-12 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
          Comparativa GAds vs Meta
        </p>
        <p className="mt-3 text-sm text-light">
          Sin datos en el rango y filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border-default bg-white">
      <div className="border-b border-border-default px-6 py-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
          Comparativa GAds vs Meta
        </h3>
        <p className="mt-1 text-[11px] text-light">
          Mismo rango de fechas. Refleja los filtros de tipo y campaña aplicados.
        </p>
      </div>

      <div className="overflow-x-auto publisher-comparison-scroll">
        <table className="w-full text-sm publisher-comparison-table">
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
            <Row
              label="Inversión"
              gads={gads ? formatCurrencyArs(gads.cost) : "—"}
              meta={meta ? formatCurrencyArs(meta.cost) : "—"}
              total={formatCurrencyArs(totals.cost)}
              emphasis
            />
            <ShareRow
              label="Share del gasto"
              gadsShare={gads?.spendShare ?? null}
              metaShare={meta?.spendShare ?? null}
            />
            <Row
              label="Conversiones"
              gads={gads ? formatInteger(gads.conversions) : "—"}
              meta={meta ? formatInteger(meta.conversions) : "—"}
              total={formatInteger(totals.conversions)}
              emphasis
            />
            <ShareRow
              label="Share de conversiones"
              gadsShare={gads?.conversionShare ?? null}
              metaShare={meta?.conversionShare ?? null}
            />
            <Row
              label="CPA"
              gads={renderCpa(gads)}
              meta={renderCpa(meta)}
              total="—"
            />
            <Row
              label="CTR"
              gads={gads ? formatRatioAsPct(gads.ctr) : "—"}
              meta={meta ? formatRatioAsPct(meta.ctr) : "—"}
              total="—"
            />
            <Row
              label="CPC"
              gads={gads ? formatCurrencyArs(gads.cpc) : "—"}
              meta={meta ? formatCurrencyArs(meta.cpc) : "—"}
              total="—"
            />
            <Row
              label="CPM"
              gads={gads ? formatCurrencyArs(gads.cpm) : "—"}
              meta={meta ? formatCurrencyArs(meta.cpm) : "—"}
              total="—"
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Sub-componentes ----------

function Row({
  label,
  gads,
  meta,
  total,
  emphasis = false,
}: {
  label: string;
  gads: string;
  meta: string;
  total: string;
  emphasis?: boolean;
}) {
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

/**
 * Fila de "share" con una barra horizontal que muestra la distribución
 * GAds vs Meta. Más legible visualmente que solo los porcentajes.
 */
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
        <ShareCell pct={gadsPct} hasData={gadsShare !== null} colorClass="bg-primary" />
      </td>
      <td className="px-6 py-4 text-right tabular-nums text-steel">
        <ShareCell pct={metaPct} hasData={metaShare !== null} colorClass="bg-accent" />
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
      <div className="relative h-2 w-24 bg-[#f0f0ea]">
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

/**
 * CPA con manejo del caso "sin conversiones" — preferimos mostrar "—"
 * antes que un $0,00 engañoso.
 */
function renderCpa(p: PublisherTotals | null): string {
  if (!p) return "—";
  if (p.conversions === 0) return "—";
  return formatCurrencyArs(p.cpa);
}
