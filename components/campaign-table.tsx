"use client";

import { useMemo, useState } from "react";
import { RiArrowUpLine, RiArrowDownLine } from "@remixicon/react";
import type { CampaignAnomalies, CampaignRow } from "@/lib/types";
import {
  formatCurrencyArs,
  formatDecimal,
  formatInteger,
  formatRatioAsPct,
} from "@/lib/format";
import { Card } from "@/components/tremor/card";

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
 * Tabla detalle de campañas con ordenamiento por columna.
 *
 * Mobile: muestra cada campaña como card vertical para evitar scroll
 * horizontal. El control de sort se conserva como un select.
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
    <Card className="p-0">
      <div className="flex items-baseline justify-between border-b border-border-default px-4 py-4 sm:px-6">
        <h3 className="eyebrow-xs">Detalle de campañas</h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-light tabular-nums">
          {rows.length} {rows.length === 1 ? "campaña" : "campañas"}
        </p>
      </div>

      {/* Mobile: sort selector + cards */}
      <div className="sm:hidden">
        <MobileSortBar
          sortKey={sortKey}
          sortDir={sortDir}
          onChange={(k, d) => {
            setSortKey(k);
            setSortDir(d);
          }}
        />
        <ul className="divide-y divide-border-soft">
          {sorted.map((row) => (
            <MobileCampaignCard
              key={row.campaignId}
              row={row}
              anomalies={anomalies?.get(row.campaignId)}
            />
          ))}
        </ul>
      </div>

      {/* Desktop: tabla completa, sin scroll horizontal salvo emergencia */}
      <div className="hidden overflow-x-auto sm:block">
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
                  <span className="block max-w-[160px] truncate sm:max-w-[280px]" title={row.name}>
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
    </Card>
  );
}

// ---------- Mobile ----------

function MobileSortBar({
  sortKey,
  sortDir,
  onChange,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onChange: (k: SortKey, d: SortDir) => void;
}) {
  const options: Array<{ k: SortKey; label: string }> = [
    { k: "cost", label: "Inversión" },
    { k: "conversions", label: "Conversiones" },
    { k: "cpa", label: "CPA" },
    { k: "clicks", label: "Clics" },
    { k: "impressions", label: "Impresiones" },
    { k: "ctr", label: "CTR" },
    { k: "cpc", label: "CPC" },
    { k: "name", label: "Nombre" },
  ];
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-default px-4 py-3">
      <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-light">
        Ordenar
        <select
          value={sortKey}
          onChange={(e) => onChange(e.target.value as SortKey, sortDir)}
          className="border border-border-default bg-white px-2 py-1 text-xs font-medium text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          {options.map((o) => (
            <option key={o.k} value={o.k}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => onChange(sortKey, sortDir === "asc" ? "desc" : "asc")}
        className="inline-flex items-center gap-1 rounded-sm text-[11px] font-semibold uppercase tracking-[0.14em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label={sortDir === "asc" ? "Ascendente" : "Descendente"}
      >
        {sortDir === "asc" ? (
          <RiArrowUpLine className="size-3.5" aria-hidden="true" />
        ) : (
          <RiArrowDownLine className="size-3.5" aria-hidden="true" />
        )}
        {sortDir === "asc" ? "Asc" : "Desc"}
      </button>
    </div>
  );
}

function MobileCampaignCard({
  row,
  anomalies,
}: {
  row: CampaignRow;
  anomalies?: CampaignAnomalies;
}) {
  return (
    <li className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-primary" title={row.name}>
            {row.name}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-light">
            {row.publisher === "gads" ? "Google Ads" : "Meta Ads"} · {row.type}
          </p>
          <AnomalyBadges a={anomalies} />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-light">
            Inversión
          </p>
          <p className="text-base font-bold tabular-nums text-primary">
            {formatCurrencyArs(row.cost)}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border-soft pt-3 text-xs">
        <Stat label="Clics" value={formatInteger(row.clicks)} />
        <Stat label="CTR" value={formatRatioAsPct(row.ctr)} />
        <Stat label="CPC" value={formatCurrencyArs(row.cpc)} />
        <Stat label="Impr." value={formatInteger(row.impressions)} />
        <Stat label="Conv." value={formatDecimal(row.conversions)} />
        <Stat
          label="CPA"
          value={row.conversions > 0 ? formatCurrencyArs(row.cpa) : "—"}
        />
      </dl>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-light">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-primary">
        {value}
      </dd>
    </div>
  );
}

// ---------- Desktop sub-componentes ----------

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
  return (
    <th
      className={`px-4 py-3 font-semibold ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`
          inline-flex items-center gap-1 rounded-sm uppercase tracking-[0.18em]
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40
          ${isActive ? "text-primary" : "hover:text-primary"}
          ${align === "right" ? "flex-row-reverse" : ""}
        `}
      >
        <span>{children}</span>
        {isActive &&
          (sortDir === "asc" ? (
            <RiArrowUpLine className="size-3" aria-hidden="true" />
          ) : (
            <RiArrowDownLine className="size-3" aria-hidden="true" />
          ))}
      </button>
    </th>
  );
}

function EmptyState() {
  return (
    <Card>
      <h3 className="mb-4 eyebrow-xs">Detalle de campañas</h3>
      <div className="flex h-[200px] items-center justify-center text-sm text-light">
        Sin campañas en el rango seleccionado
      </div>
    </Card>
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
