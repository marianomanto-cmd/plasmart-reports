// Gráfico de evolución diaria de inversión por publisher.
// Implementado con Tremor AreaChart (Recharts, client-side).

"use client";

import type { DailyByPublisherPoint } from "@/lib/types";
import { formatCurrencyArs } from "@/lib/format";
import { AreaChart } from "@/components/tremor/area-chart";
import { Card } from "@/components/tremor/card";

interface Props {
  points: DailyByPublisherPoint[];
  fromIso: string;
  toIso: string;
}

const CATEGORIES = ["Google Ads", "Meta Ads"] as const;

export function CostEvolutionChart({ points }: Props) {
  // Pivot a registros { date, "Google Ads", "Meta Ads" } para Recharts.
  const byDate = new Map<string, { gads: number; meta: number }>();
  for (const p of points) {
    const cur = byDate.get(p.date) ?? { gads: 0, meta: 0 };
    if (p.publisher === "gads") cur.gads += p.cost;
    else cur.meta += p.cost;
    byDate.set(p.date, cur);
  }
  const dates = Array.from(byDate.keys()).sort();

  if (dates.length === 0) {
    return <EmptyState />;
  }

  // Acumulamos los totales en un loop aparte (no dentro del .map de
  // render): reasignar variables externas dentro del callback que arma
  // la data de render rompe la regla del React Compiler.
  let totalGads = 0;
  let totalMeta = 0;
  for (const v of byDate.values()) {
    totalGads += v.gads;
    totalMeta += v.meta;
  }
  const data = dates.map((d) => {
    const v = byDate.get(d)!;
    return {
      date: shortLabel(d),
      [CATEGORIES[0]]: v.gads,
      [CATEGORIES[1]]: v.meta,
    };
  });

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h3 className="eyebrow-xs">Evolución de inversión diaria</h3>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          <LegendItem
            color="bg-[var(--color-gads)]"
            label="Google Ads"
            total={totalGads}
          />
          <LegendItem
            color="bg-[var(--color-meta)]"
            label="Meta Ads"
            total={totalMeta}
          />
        </div>
      </div>

      {/* Resumen accesible: los lectores de pantalla no pueden leer el SVG
          del chart, así que les damos la conclusión en texto. */}
      <p className="sr-only">
        Evolución diaria de inversión sobre {dates.length}{" "}
        {dates.length === 1 ? "día" : "días"}. Google Ads totalizó{" "}
        {formatCurrencyArs(totalGads)}; Meta Ads totalizó{" "}
        {formatCurrencyArs(totalMeta)}.
      </p>

      <AreaChart
        data={data}
        index="date"
        categories={[...CATEGORIES]}
        colors={["cyan", "violet"]}
        valueFormatter={(v: number) => formatCurrencyArs(v)}
        showLegend={false}
        showGridLines
        yAxisWidth={56}
        className="h-64 sm:h-72"
      />
    </Card>
  );
}

function LegendItem({
  color,
  label,
  total,
}: {
  color: string;
  label: string;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`inline-block h-0.5 w-4 ${color}`} />
      <span className="text-[11px] uppercase tracking-[0.12em] text-light">
        {label}
      </span>
      <span className="text-[12px] font-semibold tabular-nums text-primary">
        {formatCurrencyArs(total)}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <h3 className="mb-4 eyebrow-xs">Evolución de inversión diaria</h3>
      <div className="flex h-[240px] items-center justify-center text-sm text-light">
        Sin datos en el rango seleccionado
      </div>
    </Card>
  );
}

function shortLabel(iso: string): string {
  // "2024-08-12" → "12 ago"
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}
