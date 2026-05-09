import type { AiAnalysisLogRow } from "@/lib/admin-queries";
import { formatInteger } from "@/lib/format";

interface Props {
  rows: AiAnalysisLogRow[];
}

/**
 * Lista de análisis generados con filas expandibles (vía `<details>`).
 * Cada summary muestra metadatos; al expandir aparece el markdown completo.
 * Server component — sin JS, usa la primitiva nativa del browser.
 */
export function AiAnalysisLogTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="border border-border-default bg-white p-12 text-center">
        <p className="text-sm text-light">
          Sin análisis generados todavía.
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-light">
          La primera vez que alguien genere uno desde el dashboard, va a aparecer acá
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border-default bg-white">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-x-4 border-b border-border-default px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-light">
        <span className="font-semibold">Fecha</span>
        <span className="font-semibold">Período · filtros · usuario</span>
        <span className="font-semibold text-right">Tokens in</span>
        <span className="font-semibold text-right">Tokens out</span>
        <span className="font-semibold text-right">Duración</span>
        <span className="font-semibold text-right">Ver</span>
      </div>

      <ul>
        {rows.map((row) => (
          <li
            key={row.id}
            className="border-b border-border-default/60 last:border-0"
          >
            <details className="group">
              <summary
                className="
                  grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto]
                  items-center gap-x-4 px-5 py-3 text-sm
                  hover:bg-cream/50
                  list-none
                  [&::-webkit-details-marker]:hidden
                "
              >
                <span className="text-steel tabular-nums whitespace-nowrap">
                  {formatTimestamp(row.generatedAt)}
                </span>
                <span className="min-w-0 truncate text-primary">
                  <span className="font-medium">
                    {formatPeriod(row.periodFrom, row.periodTo)}
                  </span>
                  <span className="text-light"> · {describeFilters(row)}</span>
                  <span className="text-light"> · {row.userEmail}</span>
                </span>
                <span className="text-right text-steel tabular-nums whitespace-nowrap">
                  {row.promptTokens !== null ? formatInteger(row.promptTokens) : "—"}
                </span>
                <span className="text-right text-steel tabular-nums whitespace-nowrap">
                  {row.completionTokens !== null
                    ? formatInteger(row.completionTokens)
                    : "—"}
                </span>
                <span className="text-right text-steel tabular-nums whitespace-nowrap">
                  {duration(row.durationMs)}
                </span>
                <span
                  className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-light transition-colors group-hover:text-primary group-open:text-primary"
                  aria-hidden="true"
                >
                  <span className="group-open:hidden">Abrir</span>
                  <span className="hidden group-open:inline">Cerrar</span>
                </span>
              </summary>

              <div className="border-t border-border-default/60 bg-cream/30 px-5 py-5">
                <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-light">
                  <span>Modelo: <span className="text-steel">{row.modelUsed}</span></span>
                  {row.dataMaxDate && (
                    <span>Datos hasta: <span className="text-steel tabular-nums">{row.dataMaxDate}</span></span>
                  )}
                  <span>Comparación: <span className="text-steel">{compareLabel(row.compareMode)}</span></span>
                </div>
                <Markdown text={row.content} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Markdown inline ----------

/**
 * Renderer chico de markdown — mismo subset que ai-analysis.tsx:
 * **negritas**, líneas que empiezan con → como acción, párrafos por
 * línea en blanco. Soft-wraps de Claude se unen.
 */
function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <div key={i} className="space-y-1.5 text-sm leading-relaxed text-primary">
          {parseBlock(block).map((seg, j) => (
            <p
              key={j}
              className={seg.trim().startsWith("→") ? "pl-4 text-steel" : ""}
            >
              {renderInline(seg)}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function parseBlock(block: string): string[] {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const segments: string[] = [];
  let body: string[] = [];

  const flushBody = () => {
    if (body.length > 0) {
      segments.push(body.join(" "));
      body = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("**") || line.startsWith("→")) {
      flushBody();
      segments.push(line);
    } else {
      body.push(line);
    }
  }
  flushBody();
  return segments;
}

function renderInline(line: string): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ---------- Formato ----------

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Cordoba",
  }).format(new Date(iso));
}

function formatPeriod(from: string, to: string): string {
  const fmt = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "UTC",
  });
  const f = fmt.format(new Date(`${from}T00:00:00Z`));
  const t = fmt.format(new Date(`${to}T00:00:00Z`));
  return `${f} → ${t}`;
}

function describeFilters(row: AiAnalysisLogRow): string {
  const parts: string[] = [];
  if (row.publisher) {
    parts.push(row.publisher === "gads" ? "Google Ads" : "Meta Ads");
  } else {
    parts.push("Todos los publishers");
  }
  if (row.campaignType) parts.push(row.campaignType.toUpperCase());
  if (row.campaignId) parts.push("Campaña específica");
  return parts.join(" · ");
}

function compareLabel(mode: string): string {
  if (mode === "yoy") return "año anterior";
  if (mode === "previous") return "período anterior";
  return "sin comparación";
}

function duration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
