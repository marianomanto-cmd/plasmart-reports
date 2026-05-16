"use client";

import { useState } from "react";
import {
  RiSparkling2Line,
  RiDownloadLine,
  RiRefreshLine,
} from "@remixicon/react";
import type { DashboardFilters } from "@/lib/types";
import { Button } from "@/components/tremor/button";
import { AnalysisContextModal } from "@/components/analysis-context-modal";

interface Props {
  filters: DashboardFilters;
}

interface ApiResponse {
  content: string;
  fromCache: boolean;
  generatedAt: string;
  modelUsed: string;
}

interface ApiError {
  error: string;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: ApiResponse }
  | { kind: "error"; message: string };

export function AiAnalysis({ filters }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  // Foco del análisis: input inline editable antes de generar.
  // Si está vacío, se usa el focus persistido en analysis_context.
  const [focus, setFocus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const run = async (forceRegenerate: boolean) => {
    setState({ kind: "loading" });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: filtersToParams(filters),
          forceRegenerate,
          focusOverride: focus.trim() || undefined,
        }),
      });

      const json = (await res.json()) as ApiResponse | ApiError;

      if (!res.ok || "error" in json) {
        const msg = "error" in json ? json.error : `HTTP ${res.status}`;
        setState({ kind: "error", message: msg });
        return;
      }

      setState({ kind: "ok", data: json });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  };

  return (
    <div className="border-t-4 border-accent bg-white">
      <div className="flex items-baseline justify-between border-b border-border-default px-4 py-4 sm:px-6">
        <h3 className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          <RiSparkling2Line className="size-4 text-accent" aria-hidden="true" />
          Análisis de Claude
        </h3>
        <Status state={state} />
      </div>

      <div className="px-4 py-6 sm:px-6">
        {state.kind === "idle" && (
          <Idle
            focus={focus}
            onFocusChange={setFocus}
            onRun={() => run(false)}
            onOpenModal={() => setModalOpen(true)}
          />
        )}

        {state.kind === "loading" && <LoadingSkeleton />}

        {state.kind === "error" && (
          <ErrorState
            message={state.message}
            onRetry={() => run(false)}
          />
        )}

        {state.kind === "ok" && (
          <Result
            data={state.data}
            filters={filters}
            onRegenerate={() => run(true)}
          />
        )}
      </div>

      <AnalysisContextModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

// ---------- Estados ----------

function Idle({
  focus,
  onFocusChange,
  onRun,
  onOpenModal,
}: {
  focus: string;
  onFocusChange: (v: string) => void;
  onRun: () => void;
  onOpenModal: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-5 py-2">
      <p className="max-w-2xl text-sm leading-relaxed text-steel">
        Generá un análisis automático del período seleccionado. Claude lee
        los KPIs, las top campañas y el tráfico de GA4 visibles en este
        reporte y devuelve recomendaciones puntuales.
      </p>

      <div className="w-full max-w-2xl space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="ai-focus-input"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"
          >
            Foco de este análisis (opcional)
          </label>
          <button
            type="button"
            onClick={onOpenModal}
            className="
              text-[10px] font-semibold uppercase tracking-[0.18em] text-light
              transition-colors duration-150 hover:text-primary
            "
          >
            Editar contexto completo
          </button>
        </div>
        <textarea
          id="ai-focus-input"
          rows={2}
          value={focus}
          onChange={(e) => onFocusChange(e.target.value)}
          placeholder="Ej.: bajar CPA en Meta sin perder volumen de leads B2B"
          className="
            w-full resize-y border border-border-default bg-white px-3 py-2
            text-sm leading-relaxed text-primary
            focus:border-primary focus:outline-none
          "
        />
        <p className="text-xs text-light">
          Si lo dejás vacío, se usa el objetivo guardado en el contexto.
        </p>
      </div>

      <Button
        type="button"
        onClick={onRun}
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Generar análisis
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <div className="h-4 w-3/5 animate-pulse bg-border-default" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse bg-border-soft" />
        <div className="h-3 w-11/12 animate-pulse bg-border-soft" />
        <div className="h-3 w-4/5 animate-pulse bg-border-soft" />
      </div>
      <div className="h-4 w-2/5 animate-pulse bg-border-default" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse bg-border-soft" />
        <div className="h-3 w-10/12 animate-pulse bg-border-soft" />
      </div>
      <p className="pt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-light">
        <RiSparkling2Line className="size-3.5 animate-pulse text-accent" aria-hidden="true" />
        Claude está leyendo los datos…
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-warning">
        No pudimos generar el análisis: {message}
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={onRetry}
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Reintentar
      </Button>
    </div>
  );
}

function Result({
  data,
  filters,
  onRegenerate,
}: {
  data: ApiResponse;
  filters: DashboardFilters;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      <MarkdownLite text={data.content} />

      <div className="flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-light tabular-nums">
          {data.fromCache ? "Cacheado" : "Generado"} ·{" "}
          {formatTimestamp(data.generatedAt)} · {data.modelUsed}
        </p>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => downloadAsPdf(data, filters)}
            className="
              inline-flex items-center gap-1.5
              text-[10px] font-semibold uppercase tracking-[0.18em] text-primary
              transition-colors duration-150 hover:text-accent
            "
          >
            <RiDownloadLine className="size-3.5" aria-hidden="true" />
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="
              inline-flex items-center gap-1.5
              text-[10px] font-semibold uppercase tracking-[0.18em] text-light
              transition-colors duration-150 hover:text-primary
            "
          >
            <RiRefreshLine className="size-3.5" aria-hidden="true" />
            Regenerar análisis
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Status indicator ----------

function Status({ state }: { state: State }) {
  if (state.kind === "loading") {
    return (
      <span className="text-[11px] uppercase tracking-[0.12em] text-light">
        Generando…
      </span>
    );
  }
  if (state.kind === "ok" && state.data.fromCache) {
    return (
      <span className="text-[11px] uppercase tracking-[0.12em] text-light">
        Desde cache
      </span>
    );
  }
  return null;
}

// ---------- Helpers ----------

/**
 * Convierte DashboardFilters al formato Record<string,string> que espera
 * la API (mismo formato que searchParams). undefined se omite, no se
 * manda como string "undefined".
 */
function filtersToParams(filters: DashboardFilters): Record<string, string> {
  const out: Record<string, string> = {
    from: filters.from,
    to: filters.to,
    compare: filters.compare,
  };
  if (filters.publisher) out.publisher = filters.publisher;
  if (filters.type) out.type = filters.type;
  if (filters.campaignId) out.campaign = filters.campaignId;
  return out;
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

/**
 * Renderer minimalista de markdown para el output de Claude.
 * Solo necesitamos: **negritas**, párrafos separados por línea en blanco,
 * y la flecha "→". Cualquier markdown más complejo lo dejamos como texto
 * plano. Mantener esto chico evita traer una dependencia (react-markdown).
 *
 * Claude soft-wrapea sus respuestas con \n cada ~80 chars. Si tratamos
 * cada \n como un párrafo nuevo, el cuerpo se ve cortado en franjas en
 * vez de fluir. Por eso unimos las líneas "normales" dentro de un mismo
 * bloque en un único párrafo, y dejamos que el browser haga el wrap.
 * Las líneas que empiezan con `**` (título) o `→` (acción) sí se
 * mantienen como segmentos separados.
 */
function MarkdownLite({ text }: { text: string }) {
  // Separar en bloques por línea en blanco
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <div key={i} className="space-y-1.5 text-sm leading-relaxed text-primary">
          {parseBlock(block).map((seg, j) => (
            <p key={j} className={lineClass(seg)}>
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

function lineClass(line: string): string {
  // La línea de acción ("→ Acción: ...") la hacemos un poco más sutil
  if (line.trim().startsWith("→")) {
    return "pl-4 text-steel";
  }
  return "";
}

function renderInline(line: string): React.ReactNode {
  // Reemplaza **texto** por <strong>texto</strong>. Sin más magia.
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

// ---------- Descarga PDF ----------

/**
 * Abre una ventana nueva con el análisis renderizado en HTML imprimible
 * y dispara el diálogo de impresión. El usuario elige "Guardar como PDF"
 * desde el diálogo nativo del navegador. Sin dependencias extra.
 */
function downloadAsPdf(data: ApiResponse, filters: DashboardFilters) {
  const win = window.open("", "_blank");
  if (!win) {
    alert(
      "El navegador bloqueó la ventana emergente. Permití pop-ups en este sitio y reintentá.",
    );
    return;
  }
  win.document.open();
  win.document.write(buildPrintableHtml(data, filters));
  win.document.close();
}

function buildPrintableHtml(
  data: ApiResponse,
  filters: DashboardFilters,
): string {
  const blocks = data.content
    .split(/\n\s*\n/)
    .filter((b) => b.trim().length > 0);

  let body = "";
  for (const block of blocks) {
    body += '<div class="block">';
    for (const seg of parseBlock(block)) {
      const cls = seg.startsWith("→")
        ? "action"
        : seg.startsWith("**")
        ? "title"
        : "body";
      const html = escapeHtml(seg).replace(
        /\*\*([^*]+)\*\*/g,
        "<strong>$1</strong>",
      );
      body += `<p class="${cls}">${html}</p>`;
    }
    body += "</div>";
  }

  const periodLabel = `${formatPrintDate(filters.from)} — ${formatPrintDate(filters.to)}`;
  const filtersLabel = describeFiltersForPrint(filters);
  const generatedLabel = formatTimestamp(data.generatedAt);
  const fileTitle = `Plasmart Analisis ${filters.from} a ${filters.to}`;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(fileTitle)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      color: #0f172a;
      line-height: 1.6;
      max-width: 720px;
      margin: 32px auto;
      padding: 0 24px;
    }
    .header {
      border-top: 4px solid #0f172a;
      padding-top: 16px;
      margin-bottom: 28px;
    }
    .label {
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #0f172a;
      font-weight: 600;
      margin: 0 0 8px 0;
    }
    .period {
      font-size: 18px;
      font-weight: bold;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .meta {
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-top: 10px;
    }
    .block { margin-bottom: 18px; page-break-inside: avoid; }
    p { margin: 0 0 6px 0; font-size: 13px; }
    p.title { font-weight: 600; margin-top: 16px; font-size: 14px; }
    p.action { padding-left: 16px; color: #475569; }
    strong { font-weight: 600; color: #0f172a; }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 36px;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="label">Análisis de Claude · Plasmart Reportería</p>
    <p class="period">${escapeHtml(periodLabel)}</p>
    <p class="meta">${escapeHtml(filtersLabel)}</p>
  </div>
  ${body}
  <div class="footer">
    Generado: ${escapeHtml(generatedLabel)} · ${escapeHtml(data.modelUsed)}
  </div>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrintDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function describeFiltersForPrint(filters: DashboardFilters): string {
  const parts: string[] = [];
  if (filters.publisher) {
    parts.push(filters.publisher === "gads" ? "Google Ads" : "Meta Ads");
  } else {
    parts.push("Todos los publishers");
  }
  if (filters.type) parts.push(filters.type.toUpperCase());
  if (filters.campaignId) parts.push("Campaña específica");
  if (filters.compare === "yoy") parts.push("vs año anterior");
  else if (filters.compare === "previous") parts.push("vs período anterior");
  return parts.join(" · ");
}
