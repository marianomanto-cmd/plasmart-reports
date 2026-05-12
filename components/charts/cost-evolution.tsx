// Gráfico de evolución diaria de inversión por publisher.
// Implementado con Tremor AreaChart (Recharts, client-side).

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

  let totalGads = 0;
  let totalMeta = 0;
  const data = dates.map((d) => {
    const v = byDate.get(d)!;
    totalGads += v.gads;
    totalMeta += v.meta;
    return {
      date: shortLabel(d),
      [CATEGORIES[0]]: v.gads,
      [CATEGORIES[1]]: v.meta,
    };
  });

  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
          Evolución de inversión diaria
        </h3>
        <div className="flex items-center gap-5 text-xs">
          <LegendItem color="bg-gray-500" label="Google Ads" total={totalGads} />
          <LegendItem color="bg-blue-500" label="Meta Ads" total={totalMeta} />
        </div>
      </div>

      <AreaChart
        data={data}
        index="date"
        categories={[...CATEGORIES]}
        colors={["gray", "blue"]}
        valueFormatter={(v: number) => formatCurrencyArs(v)}
        showLegend={false}
        showGridLines
        yAxisWidth={64}
        className="h-72"
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
      <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
        Evolución de inversión diaria
      </h3>
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
