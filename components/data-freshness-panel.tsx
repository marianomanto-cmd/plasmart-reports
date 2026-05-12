import type { DataFreshnessRow, DataSource } from "@/lib/admin-queries";
import { formatInteger } from "@/lib/format";
import { Card } from "@/components/tremor/card";

interface Props {
  rows: DataFreshnessRow[];
}

export function DataFreshnessPanel({ rows }: Props) {
  // Indexamos por source para garantizar el orden gads → meta → ga4
  // independientemente de cómo venga la respuesta.
  const byKey = new Map<DataSource, DataFreshnessRow>();
  for (const r of rows) byKey.set(r.source, r);

  const order: Array<{ key: DataSource; label: string }> = [
    { key: "gads", label: "Google Ads" },
    { key: "meta", label: "Meta Ads" },
    { key: "ga4", label: "Google Analytics" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {order.map(({ key, label }) => {
        const row = byKey.get(key);
        return (
          <Card key={key}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
              {label}
            </p>
            <p className="mt-3 text-[20px] font-bold leading-tight text-primary tabular-nums">
              {row?.maxDataDate
                ? formatHumanDate(row.maxDataDate)
                : "Sin datos"}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-light tabular-nums">
              {row && row.rowsTotal > 0
                ? `${formatInteger(row.rowsTotal)} ${row.rowsTotal === 1 ? "fila" : "filas"} acumuladas`
                : "—"}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

function formatHumanDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
