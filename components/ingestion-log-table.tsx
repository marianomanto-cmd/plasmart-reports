import type { IngestionLogRow } from "@/lib/admin-queries";
import { formatInteger } from "@/lib/format";

interface Props {
  rows: IngestionLogRow[];
}

export function IngestionLogTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="border border-border-default bg-white p-12 text-center">
        <p className="text-sm text-light">
          Sin ejecuciones registradas todavía.
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-light">
          La primera corrida automática es el lunes a las 18:00 ART
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border-default bg-white">
      <div className="overflow-x-auto" aria-label="Desliza horizontalmente para ver más columnas">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border-default text-[10px] uppercase tracking-[0.18em] text-light">
              <th className="px-3 py-2.5 text-left font-semibold sm:px-4 sm:py-3">Inicio</th>
              <th className="px-3 py-2.5 text-left font-semibold sm:px-4 sm:py-3">Fuente</th>
              <th className="px-3 py-2.5 text-left font-semibold sm:px-4 sm:py-3">Estado</th>
              <th className="px-3 py-2.5 text-right font-semibold sm:px-4 sm:py-3">Filas</th>
              <th className="px-3 py-2.5 text-right font-semibold sm:px-4 sm:py-3">Duración</th>
              <th className="px-3 py-2.5 text-left font-semibold sm:px-4 sm:py-3">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border-default/60 last:border-0 hover:bg-cream/50"
              >
                <td className="px-3 py-2.5 text-steel tabular-nums sm:px-4 sm:py-3">
                  {formatTimestamp(row.startedAt)}
                </td>
                <td className="px-3 py-2.5 text-primary font-medium sm:px-4 sm:py-3">
                  {sourceLabel(row.source)}
                </td>
                <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2.5 text-right text-steel tabular-nums sm:px-4 sm:py-3">
                  {row.rowsInserted !== null
                    ? formatInteger(row.rowsInserted)
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-steel tabular-nums sm:px-4 sm:py-3">
                  {duration(row.startedAt, row.finishedAt)}
                </td>
                <td className="px-3 py-2.5 text-steel sm:px-4 sm:py-3">
                  {row.errorMessage ? (
                    <span
                      className="block max-w-[200px] truncate text-warning sm:max-w-[300px] lg:max-w-[400px]"
                      title={row.errorMessage}
                    >
                      {row.errorMessage}
                    </span>
                  ) : row.fileName ? (
                    <span
                      className="block max-w-[200px] truncate text-[12px] sm:max-w-[300px] lg:max-w-[400px]"
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
    </div>
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
        inline-block border px-2 py-0.5
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
    meta: "Meta Ads",
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
