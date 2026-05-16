"use client";

import { useMemo, useState } from "react";
import { RiArrowUpLine, RiArrowDownLine } from "@remixicon/react";
import type { Ga4SourceMediumRow } from "@/lib/types";
import {
  formatDecimal,
  formatInteger,
  formatRatioAsPct,
} from "@/lib/format";
import { Card } from "@/components/tremor/card";

type SortKey =
  | "source"
  | "medium"
  | "sessions"
  | "users"
  | "keyEvents"
  | "bounceRate";

type SortDir = "asc" | "desc";

interface Props {
  rows: Ga4SourceMediumRow[];
}

export function Ga4SourceMediumTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
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
        "sessions",
        "users",
        "keyEvents",
        "bounceRate",
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
        <h3 className="eyebrow-xs">Tráfico por fuente y medio</h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-light tabular-nums">
          {rows.length} {rows.length === 1 ? "combinación" : "combinaciones"}
        </p>
      </div>

      {/* Mobile: lista de cards */}
      <ul className="divide-y divide-border-soft sm:hidden">
        {sorted.map((row, i) => (
          <li key={`${row.source}-${row.medium}-${i}`} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium text-primary"
                  title={row.source}
                >
                  {row.source || "(direct)"}
                </p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-light">
                  {row.medium || "(none)"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-light">
                  Sesiones
                </p>
                <p className="text-sm font-bold tabular-nums text-primary">
                  {formatInteger(row.sessions)}
                </p>
              </div>
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-border-soft pt-2 text-xs">
              <div>
                <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-light">
                  Usuarios
                </dt>
                <dd className="tabular-nums text-steel">
                  {formatInteger(row.users)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-light">
                  Eventos
                </dt>
                <dd className="tabular-nums text-steel">
                  {formatDecimal(row.keyEvents)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-light">
                  Bounce
                </dt>
                <dd className="tabular-nums text-steel">
                  {formatRatioAsPct(row.bounceRate)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-[10px] uppercase tracking-[0.18em] text-light">
              <Th k="source"     sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="left">Fuente</Th>
              <Th k="medium"     sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="left">Medio</Th>
              <Th k="sessions"   sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">Sesiones</Th>
              <Th k="users"      sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">Usuarios</Th>
              <Th k="keyEvents"  sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">Eventos</Th>
              <Th k="bounceRate" sortKey={sortKey} sortDir={sortDir} onClick={onHeaderClick} align="right">Bounce</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={`${row.source}-${row.medium}-${i}`}
                className="border-b border-border-default/60 last:border-0 hover:bg-cream/50"
              >
                <td className="px-4 py-3 text-primary">
                  <span className="block max-w-[140px] truncate sm:max-w-[220px]" title={row.source}>
                    {row.source || "(direct)"}
                  </span>
                </td>
                <td className="px-4 py-3 text-steel">
                  {row.medium || "(none)"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                  {formatInteger(row.sessions)}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {formatInteger(row.users)}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {formatDecimal(row.keyEvents)}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {formatRatioAsPct(row.bounceRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
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
  return (
    <th
      className={`px-4 py-3 font-semibold ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`
          inline-flex items-center gap-1 uppercase tracking-[0.18em]
          transition-colors duration-150
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
      <h3 className="mb-4 eyebrow-xs">Tráfico por fuente y medio</h3>
      <div className="flex h-[200px] items-center justify-center text-sm text-light">
        Sin datos de GA4 en el rango seleccionado
      </div>
    </Card>
  );
}
