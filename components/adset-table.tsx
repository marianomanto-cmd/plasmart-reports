"use client";

import { useMemo, useState } from "react";
import { RiArrowUpLine, RiArrowDownLine } from "@remixicon/react";
import type { AdsetRow } from "@/lib/types";
import {
  formatCurrencyArs,
  formatDecimal,
  formatInteger,
  formatRatioAsPct,
} from "@/lib/format";
import { Card } from "@/components/tremor/card";

type SortKey =
  | "adsetName"
  | "campaignName"
  | "publisher"
  | "cost"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "conversions"
  | "cpa";

type SortDir = "asc" | "desc";

interface Props {
  rows: AdsetRow[];
}

export function AdsetTable({ rows }: Props) {
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
        <h3 className="eyebrow-xs">Detalle de ad groups</h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-light tabular-nums">
          {rows.length} {rows.length === 1 ? "ad group" : "ad groups"}
        </p>
      </div>

      {/* Mobile: lista de cards */}
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
            <MobileAdsetCard key={row.adsetId} row={row} />
          ))}
        </ul>
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-[10px] uppercase tracking-[0.18em] text-light">
              <Th k="adsetName"   sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="left">Ad group</Th>
              <Th k="campaignName" sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="left">Campaña</Th>
              <Th k="publisher"   sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="left">Publisher</Th>
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
                key={row.adsetId}
                className="border-b border-border-default/60 last:border-0 hover:bg-cream/50"
              >
                <td className="px-4 py-3 text-primary">
                  <span className="block max-w-[160px] truncate sm:max-w-[240px]" title={row.adsetName}>
                    {row.adsetName}
                  </span>
                </td>
                <td className="px-4 py-3 text-steel">
                  <span className="block max-w-[140px] truncate sm:max-w-[200px]" title={row.campaignName}>
                    {row.campaignName}
                  </span>
                </td>
                <td className="px-4 py-3 text-steel">
                  {row.publisher === "gads" ? "Google Ads" : "Meta Ads"}
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
    { k: "adsetName", label: "Nombre" },
  ];
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-default px-4 py-3">
      <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-light">
        Ordenar
        <select
          value={sortKey}
          onChange={(e) => onChange(e.target.value as SortKey, sortDir)}
          className="border border-border-default bg-card px-2 py-1 text-xs font-medium text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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

function MobileAdsetCard({ row }: { row: AdsetRow }) {
  return (
    <li className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-primary" title={row.adsetName}>
            {row.adsetName}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-steel" title={row.campaignName}>
            {row.campaignName}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-light">
            {row.publisher === "gads" ? "Google Ads" : "Meta Ads"}
          </p>
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
        <Stat label="CPA" value={row.conversions > 0 ? formatCurrencyArs(row.cpa) : "—"} />
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
      <dd className="mt-0.5 font-semibold tabular-nums text-primary">{value}</dd>
    </div>
  );
}

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
    <th className={`px-4 py-3 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>
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
      <h3 className="mb-4 eyebrow-xs">Detalle de ad groups</h3>
      <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-light">
        <p>Sin datos de ad groups en el rango y filtros seleccionados.</p>
        <p className="text-xs">
          Recordá que la ingesta de ad groups está disponible sólo para Google Ads
          (y requiere que el script semanal ya haya corrido).
        </p>
      </div>
    </Card>
  );
}
