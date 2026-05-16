import type { IngestionLogRow } from "@/lib/admin-queries";
import { formatInteger } from "@/lib/format";
import { Card } from "@/components/tremor/card";

interface Props {
  rows: IngestionLogRow[];
}

export function IngestionLogTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-sm text-light">
          Sin ejecuciones registradas todavía.
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-light">
          La primera corrida automática es el lunes a las 18:00 ART
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      {/* Mobile: lista de cards */}
      <ul className="divide-y divide-border-soft sm:hidden">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">
                  {sourceLabel(row.source)}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-light">
                  {formatTimestamp(row.startedAt)} · {duration(row.startedAt, row.finishedAt)}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border-soft pt-2 text-xs">
              <span className="text-light">Filas</span>
              <span className="font-semibold tabular-nums text-primary">
                {row.rowsInserted !== null ? formatInteger(row.rowsInserted) : "—"}
              </span>
            </div>
            {(row.errorMessage || row.fileName) && (
              <p
                className={`mt-2 break-words text-[11px] ${
                  row.errorMessage ? "text-warning" : "text-steel"
                }`}
                title={row.errorMessage ?? row.fileName ?? undefined}
              >
                {row.errorMessage ?? row.fileName}
              </p>
            )}
          </li>
        ))}
      </ul>

      {/* Desktop: tabla */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-[10px] uppercase tracking-[0.18em] text-light">
              <th className="px-4 py-3 text-left font-semibold">Inicio</th>
              <th className="px-4 py-3 text-left font-semibold">Fuente</th>
              <th className="px-4 py-3 text-left font-semibold">Estado</th>
              <th className="px-4 py-3 text-right font-semibold">Filas</th>
              <th className="px-4 py-3 text-right font-semibold">Duración</th>
              <th className="px-4 py-3 text-left font-semibold">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border-default/60 last:border-0 hover:bg-cream/50"
              >
                <td className="px-4 py-3 text-steel tabular-nums">
                  {formatTimestamp(row.startedAt)}
                </td>
                <td className="px-4 py-3 text-primary font-medium">
                  {sourceLabel(row.source)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {row.rowsInserted !== null
                    ? formatInteger(row.rowsInserted)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-steel tabular-nums">
                  {duration(row.startedAt, row.finishedAt)}
                </td>
                <td className="px-4 py-3 text-steel">
                  {row.errorMessage ? (
                    <span
                      className="block max-w-[200px] truncate text-warning sm:max-w-[400px]"
                      title={row.errorMessage}
                    >
                      {row.errorMessage}
                    </span>
                  ) : row.fileName ? (
                    <span
                      className="block max-w-[200px] truncate text-[12px] sm:max-w-[400px]"
                      title={row.fileName}
                    >
                      {row.fileName}
                    </span>
                  ) : (
                    <span className="text-light">—</span>
                  )}
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

function StatusBadge({ status }: { status: IngestionLogRow["status"] }) {
  const config: Record<
    IngestionLogRow["status"],
    { label: string; className: string }
  > = {
    success: {
      label: "OK",
      className: "border-success text-success",
    },
    partial: {
      label: "Parcial",
      className: "border-warning text-warning",
    },
    failed: {
      label: "Falló",
      className: "border-warning bg-warning text-white",
    },
    running: {
      label: "Corriendo",
      className: "border-light text-light",
    },
  };
  const cfg = config[status];

  return (
    <span
      className={`
        inline-block whitespace-nowrap border px-2 py-0.5
        text-[10px] font-semibold uppercase tracking-[0.15em]
        ${cfg.className}
      `}
    >
      {cfg.label}
    </span>
  );
}

// ---------- Helpers ----------

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    gads: "Google Ads",
    gads_adsets: "Google Ads · Adsets",
    gads_ads: "Google Ads · Ads",
    meta: "Meta Ads",
    meta_adsets: "Meta Ads · Adsets",
    meta_ads: "Meta Ads · Ads",
    ga4: "Google Analytics",
  };
  return map[source] ?? source;
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Cordoba",
  }).format(new Date(iso));
}

function duration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return "< 1s";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m`;
}
