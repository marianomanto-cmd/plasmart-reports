// Top 10 ads individuales por inversión en el período.
// Mismo patrón mobile-friendly que top-adsets / top-campaigns.

"use client";

import type { AdRow } from "@/lib/types";
import { formatCurrencyArs } from "@/lib/format";
import { BarChart } from "@/components/tremor/bar-chart";
import { Card } from "@/components/tremor/card";

interface Props {
  rows: AdRow[];
}

export function TopAdsChart({ rows }: Props) {
  const top = rows.slice(0, 10);

  if (top.length === 0) {
    return <EmptyState />;
  }

  const data = top.map((row) => ({
    name: truncate(row.adName, 36),
    "Google Ads": row.publisher === "gads" ? row.cost : 0,
    "Meta Ads": row.publisher === "meta" ? row.cost : 0,
  }));

  const maxCost = Math.max(...top.map((r) => r.cost), 1);

  return (
    <Card className="p-0">
      <div className="flex items-baseline justify-between border-b border-border-default px-6 py-4">
        <h3 className="eyebrow-xs">Top ads por inversión</h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-light tabular-nums">
          {top.length} de {rows.length}
        </p>
      </div>

      <div className="hidden sm:block sm:p-6">
        <BarChart
          data={data}
          index="name"
          categories={["Google Ads", "Meta Ads"]}
          colors={["gray", "blue"]}
          valueFormatter={(v: number) => formatCurrencyArs(v)}
          layout="vertical"
          type="stacked"
          showLegend={false}
          yAxisWidth={220}
          barCategoryGap="20%"
          className="h-[420px]"
        />
      </div>

      <ul className="divide-y divide-border-soft sm:hidden">
        {top.map((row) => {
          const pct = (row.cost / maxCost) * 100;
          const isGads = row.publisher === "gads";
          return (
            <li key={row.adId} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className="block min-w-0 flex-1 truncate text-sm font-medium text-primary"
                  title={row.adName}
                >
                  {row.adName}
                </span>
                <span className="text-sm font-semibold tabular-nums text-primary">
                  {formatCurrencyArs(row.cost)}
                </span>
              </div>
              <p
                className="mt-0.5 truncate text-[11px] text-light"
                title={`${row.adsetName} · ${row.campaignName}`}
              >
                {row.adsetName} · {row.campaignName}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    isGads ? "text-steel" : "text-brand"
                  }`}
                >
                  {isGads ? "Google Ads" : "Meta Ads"}
                </span>
                <div className="relative h-1.5 flex-1 bg-border-soft">
                  <div
                    className={`absolute inset-y-0 left-0 ${
                      isGads ? "bg-[var(--color-gads)]" : "bg-[var(--color-meta)]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function EmptyState() {
  return (
    <Card>
      <h3 className="mb-4 eyebrow-xs">Top ads por inversión</h3>
      <div className="flex h-[200px] items-center justify-center text-sm text-light">
        Sin ads en el rango seleccionado
      </div>
    </Card>
  );
}
