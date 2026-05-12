// Top 10 campañas por inversión en el período.
// Implementado con Tremor BarChart horizontal (Recharts, client-side).

import type { CampaignRow } from "@/lib/types";
import { formatCurrencyArs } from "@/lib/format";
import { BarChart } from "@/components/tremor/bar-chart";
import { Card } from "@/components/tremor/card";

interface Props {
  rows: CampaignRow[];
}

export function TopCampaignsChart({ rows }: Props) {
  const top = rows.slice(0, 10);

  if (top.length === 0) {
    return <EmptyState />;
  }

  // BarChart horizontal espera `data` con un campo `index` (texto en el eje
  // categorial) y una `category` con el valor numérico. Para que se vean
  // GAds y Meta con colores distintos, separamos en dos categorías (una por
  // publisher) y rellenamos con 0 en la opuesta — así las barras se
  // colorean según el publisher de la fila.
  const data = top.map((row) => ({
    name: truncate(row.name, 36),
    publisher:
      row.publisher === "gads" ? "Google Ads" : "Meta Ads",
    "Google Ads": row.publisher === "gads" ? row.cost : 0,
    "Meta Ads": row.publisher === "meta" ? row.cost : 0,
  }));

  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
          Top campañas por inversión
        </h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-light tabular-nums">
          {top.length} de {rows.length}
        </p>
      </div>

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
      <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
        Top campañas por inversión
      </h3>
      <div className="flex h-[200px] items-center justify-center text-sm text-light">
        Sin campañas en el rango seleccionado
      </div>
    </Card>
  );
}
