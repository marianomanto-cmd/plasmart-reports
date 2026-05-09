"use client";

import { useMemo, useState } from "react";
import type { CampaignAnomalies, CampaignRow } from "@/lib/types";
import {
  formatCurrencyArs,
  formatDecimal,
  formatInteger,
  formatRatioAsPct,
} from "@/lib/format";

type SortKey =
  | "name"
  | "publisher"
  | "type"
  | "cost"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "conversions"
  | "cpa";

type SortDir = "asc" | "desc";

interface Props {
  rows: CampaignRow[];
  anomalies?: Map<string, CampaignAnomalies>;
}

/**
 * Tabla detalle de campañas. Ordenable por columna haciendo click en el header.
 * Default: orden por inversión descendente (lo que ya viene de la RPC).
 *
 * Es Client Component porque el ordenamiento es interacción local: cambiar
 * el sort no debería disparar una nueva query a la BD.
 */
export function CampaignTable({ rows, anomalies }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv, "es");
      } else {
        cmp = Number(av) - Number(bv);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const onHeaderClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Para columnas numéricas el primer click queremos desc; para texto, asc.
      const numeric: SortKey[] = [
        "cost", "impressions", "clicks", "ctr", "cpc", "conversions", "cpa",
      ];
      setSortDir(numeric.includes(key) ? "desc" : "asc");
    }
  };

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="border border-border-default bg-white">
      <div className="flex items-baseline justify-between border-b border-border-default px-6 py-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
          Detalle de campañas
        </h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-light tabular-nums">
          {rows.length} {rows.length === 1 ? "campaña" : "campañas"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-[10px] uppercase tracking-[0.18em] text-light">
              <Th k="name"        sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="left">Campaña</Th>
              <Th k="publisher"   sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="left">Publisher</Th>
              <Th k="type"        sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="left">Tipo</Th>
              <Th k="cost"        sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">Inversión</Th>
              <Th k="impressions" sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">Impr.</Th>
              <Th k="clicks"      sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">Clics</Th>
              <Th k="ctr"         sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">CTR</Th>
              <Th k="cpc"         sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">CPC</Th>
              <Th k="conversions" sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">Conv.</Th>
              <Th k="cpa"         sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">CPA</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.campaignId}
                className="border-b border-border-default/60 last:border-0 hover:bg-cream/50"
              >
                <td className="px-4 py-3 text-primary">
                  <span className="block max-w-[280px] truncate" title={row.name}>
                    {row.name}
                  </span>
                  <AnomalyBadges a={anomalies?.get(row.campaignId)} />
                </td>
                <td className="px-4 py-3 text-steel">
                  {row.publisher === "gads" ? "Google Ads" : "Meta Ads"}
                </td>
                <td className="px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-steel">
                  {row.type}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                  {formatCurrencyArs(row.cost)}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {formatInteger(row.impressions)}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {formatInteger(row.clicks)}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {formatRatioAsPct(row.ctr)}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {formatCurrencyArs(row.cpc)}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {formatDecimal(row.conversions)}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {row.conversions > 0 ? formatCurrencyArs(row.cpa) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Sub-componentes ----------

function Th({
  k,
  sortKey,
  sortDir,
  onClick,
  align,
  children,
}: {
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
  align: "left" | "right";
  children: React.ReactNode;
}) {
  const isActive = sortKey === k;
  const arrow = isActive ? (sortDir === "asc" ? "▲" : "▼") : "";
  return (
    <th
      className={`px-4 py-3 font-semibold ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`
          inline-flex items-center gap-1.5 uppercase tracking-[0.18em]
          transition-colors duration-150
          ${isActive ? "text-primary" : "hover:text-primary"}
          ${align === "right" ? "flex-row-reverse" : ""}
        `}
      >
        <span>{children}</span>
        {arrow && <span className="text-[8px] leading-none">{arrow}</span>}
      </button>
    </th>
  );
}

function EmptyState() {
  return (
    <div className="border border-border-default bg-white p-6">
      <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
        Detalle de campañas
      </h3>
      <div className="flex h-[200px] items-center justify-center text-sm text-light">
        Sin campañas en el rango seleccionado
      </div>
    </div>
  );
}

// ---------- Badges de anomalía ----------

function AnomalyBadges({ a }: { a: CampaignAnomalies | undefined }) {
  if (!a) return null;
  if (!a.isLearning && !a.cpcIncreased && !a.isWasteful) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {a.isLearning && (
        <Badge
          label="Aprendizaje"
          tone="neutral"
          title="Campaña con datos hace menos de 7 días — los KPIs todavía son inestables"
        />
      )}
      {a.cpcIncreased && (
        <Badge
          label="CPC ↑"
          tone="warning"
          title="El CPC subió más del 50% vs el período de comparación"
        />
      )}
      {a.isWasteful && (
        <Badge
          label="Desperdicio"
          tone="warning"
          title="Más del 30% del gasto, menos del 10% de las conversiones"
        />
      )}
    </div>
  );
}

function Badge({
  label,
  tone,
  title,
}: {
  label: string;
  tone: "neutral" | "warning";
  title: string;
}) {
  const colorClass =
    tone === "warning"
      ? "border-warning text-warning"
      : "border-light text-light";
  return (
    <span
      title={title}
      className={`inline-block border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${colorClass}`}
    >
      {label}
    </span>
  );
}
