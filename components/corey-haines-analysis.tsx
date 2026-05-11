"use client";

import { useState } from "react";
import type { DashboardFilters } from "@/lib/types";

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

const ACTIVE_SKILLS = [
  "paid-ads",
  "ad-creative",
  "analytics-tracking",
  "ab-test-setup",
  "marketing-ideas",
  "customer-research",
  "competitor-profiling",
];

export function CoreyHainesAnalysis({ filters }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const run = async (forceRegenerate: boolean) => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/corey-haines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: filtersToParams(filters),
          forceRegenerate,
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
    <div className="border-t-4 border-primary bg-white">
      <div className="flex items-baseline justify-between border-b border-border-default px-6 py-4">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            Reporte Corey Haines
          </h3>
          <p className="mt-0.5 text-[11px] text-light">
            {ACTIVE_SKILLS.length} skills aplicadas al período
          </p>
        </div>
        <Status state={state} />
      </div>

      <div className="px-6 py-6">
        {state.kind === "idle" && <Idle onRun={() => run(false)} />}
        {state.kind === "loading" && <LoadingSkeleton />}
        {state.kind === "error" && (
          <ErrorState message={state.message} onRetry={() => run(false)} />
        )}
        {state.kind === "ok" && (
          <Result
            data={state.data}
            filters={filters}
            onRegenerate={() => run(true)}
          />
        )}
      </div>
    </div>
  );
}

// ---------- Estados ----------

function Idle({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex flex-col items-start gap-5 py-2">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm leading-relaxed text-steel">
          Análisis ejecutivo aplicando los frameworks de{" "}
          <a
            href="https://github.com/coreyhaines31/marketingskills"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Corey Haines marketing skills
          </a>{" "}
          a los datos del período seleccionado. Devuelve diagnóstico,
          recomendaciones priorizadas con justificación, tests sugeridos y
          gaps de medición.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVE_SKILLS.map((s) => (
            <span
              key={s}
              className="
                border border-border-default bg-cream px-2 py-0.5
                text-[10px] font-medium uppercase tracking-[0.12em] text-steel
              "
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onRun}
        className="
          border border-primary bg-primary px-5 py-2.5
          text-[11px] font-semibold uppercase tracking-[0.18em] text-white
          transition-colors duration-150 hover:bg-white hover:text-primary
        "
      >
        Generar reporte
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <div className="h-4 w-2/5 animate-pulse bg-[#e5e5e0]" />
        <div className="h-3 w-full animate-pulse bg-[#f0f0ea]" />
        <div className="h-3 w-11/12 animate-pulse bg-[#f0f0ea]" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-4 w-1/3 animate-pulse bg-[#e5e5e0]" />
        <div className="h-3 w-full animate-pulse bg-[#f0f0ea]" />
        <div className="h-3 w-10/12 animate-pulse bg-[#f0f0ea]" />
        <div className="h-3 w-9/12 animate-pulse bg-[#f0f0ea]" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full animate-pulse bg-[#f0f0ea]" />
        <div className="h-3 w-11/12 animate-pulse bg-[#f0f0ea]" />
      </div>
      <p className="pt-2 text-[11px] uppercase tracking-[0.18em] text-light">
        Aplicando frameworks · esto puede tardar 30-60 segundos…
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
      <p className="text-sm text-warning">No pudimos generar el reporte: {message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="
          border border-primary px-4 py-2
          text-[11px] font-semibold uppercase tracking-[0.18em] text-primary
          transition-colors duration-150 hover:bg-primary hover:text-white
        "
      >
        Reintentar
      </button>
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
      <ReportMarkdown text={data.content} />

      <div className="flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-light tabular-nums">
          {data.fromCache ? "Cacheado" : "Generado"} ·{" "}
          {formatTimestamp(data.generatedAt)} · {data.modelUsed}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={() => downloadPdf(filters)}
            className="
              text-[10px] font-semibold uppercase tracking-[0.18em] text-primary
              transition-colors duration-150 hover:text-light
            "
          >
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="
              text-[10px] font-semibold uppercase tracking-[0.18em] text-light
              transition-colors duration-150 hover:text-primary
            "
          >
            Regenerar reporte
          </button>
        </div>
      </div>
    </div>
  );
}

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

/**
 * Pide el PDF al endpoint /api/corey-haines/pdf y dispara la descarga en
 * el browser. El endpoint usa el análisis cacheado del período (que ya
 * existe porque el usuario lo generó arriba). Si el cache no está
 * disponible, devuelve 404 y mostramos un alert.
 */
async function downloadPdf(filters: DashboardFilters) {
  const params = new URLSearchParams(filtersToParams(filters));
  const url = `/api/corey-haines/pdf?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      alert(
        body?.error ??
          `No pudimos descargar el PDF (HTTP ${res.status}). Reintentá.`,
      );
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `plasmart-corey-${filters.from}_a_${filters.to}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    alert(`Error descargando el PDF: ${(err as Error).message}`);
  }
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

// ---------- Renderer markdown ----------
//
// Soporta: **negritas**, *itálicas* (típicamente etiquetas tipo *Skill:*),
// líneas que empiezan con "→" (acción), y bullets que arrancan con "-" o "•".
// Bloques separados por línea en blanco.

function ReportMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <Block key={i} raw={block} />
      ))}
    </div>
  );
}

function Block({ raw }: { raw: string }) {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // ¿Es un bloque que arranca con un título en negrita?
  // Si sí, lo separamos visualmente del cuerpo.
  const firstIsTitle = lines[0]?.startsWith("**") && lines[0]?.endsWith("**");

  return (
    <div
      className={`text-sm leading-relaxed text-primary ${
        firstIsTitle ? "border-t border-border-default pt-4" : ""
      }`}
    >
      {lines.map((line, idx) => (
        <Line key={idx} line={line} />
      ))}
    </div>
  );
}

function Line({ line }: { line: string }) {
  // Acción
  if (line.startsWith("→")) {
    return (
      <p className="mt-1.5 pl-4 text-steel">{renderInline(line)}</p>
    );
  }
  // Bullet
  if (line.startsWith("- ") || line.startsWith("• ")) {
    return (
      <p className="mt-1 pl-4 text-steel before:mr-2 before:text-light before:content-['·']">
        {renderInline(line.replace(/^[-•]\s+/, ""))}
      </p>
    );
  }
  // Título tipo "**Diagnóstico ejecutivo**" o "**1. Título**"
  if (line.startsWith("**") && line.endsWith("**") && !line.includes(" ", 2)) {
    return (
      <p className="mt-2 text-base font-semibold text-primary">
        {line.slice(2, -2)}
      </p>
    );
  }
  if (line.startsWith("**") && line.endsWith("**")) {
    return (
      <p className="mt-2 text-[15px] font-semibold tracking-tight text-primary">
        {line.slice(2, -2)}
      </p>
    );
  }
  return <p className="mt-1">{renderInline(line)}</p>;
}

/**
 * Renderiza inline: **bold** y *italic*. Usa una regex que captura los
 * dos tipos a la vez para no perder el orden del texto.
 */
function renderInline(line: string): React.ReactNode {
  const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      return (
        <em key={i} className="not-italic text-light">
          {tok.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}
