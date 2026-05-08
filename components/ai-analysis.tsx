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

export function AiAnalysis({ filters }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const run = async (forceRegenerate: boolean) => {
    setState({ kind: "loading" });

    try {
      const res = await fetch("/api/analyze", {
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
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          Análisis de Claude
        </h3>
        <Status state={state} />
      </div>

      <div className="px-6 py-6">
        {state.kind === "idle" && (
          <Idle onRun={() => run(false)} />
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
    <div className="flex flex-col items-start gap-4 py-2">
      <p className="max-w-2xl text-sm leading-relaxed text-steel">
        Generá un análisis automático del período seleccionado. Claude lee
        los KPIs, las top campañas y el tráfico de GA4 visibles en este
        reporte y devuelve recomendaciones puntuales.
      </p>
      <button
        type="button"
        onClick={onRun}
        className="
          border border-primary bg-primary px-5 py-2.5
          text-[11px] font-semibold uppercase tracking-[0.18em] text-white
          transition-colors duration-150 hover:bg-white hover:text-primary
        "
      >
        Generar análisis
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <div className="h-4 w-3/5 animate-pulse bg-[#e5e5e0]" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse bg-[#f0f0ea]" />
        <div className="h-3 w-11/12 animate-pulse bg-[#f0f0ea]" />
        <div className="h-3 w-4/5 animate-pulse bg-[#f0f0ea]" />
      </div>
      <div className="h-4 w-2/5 animate-pulse bg-[#e5e5e0]" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse bg-[#f0f0ea]" />
        <div className="h-3 w-10/12 animate-pulse bg-[#f0f0ea]" />
      </div>
      <p className="pt-2 text-[11px] uppercase tracking-[0.18em] text-light">
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
  onRegenerate,
}: {
  data: ApiResponse;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      <MarkdownLite text={data.content} />

      <div className="flex items-center justify-between border-t border-border-default pt-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-light tabular-nums">
          {data.fromCache ? "Cacheado" : "Generado"} ·{" "}
          {formatTimestamp(data.generatedAt)} · {data.modelUsed}
        </p>
        <button
          type="button"
          onClick={onRegenerate}
          className="
            text-[10px] font-semibold uppercase tracking-[0.18em] text-light
            transition-colors duration-150 hover:text-primary
          "
        >
          Regenerar análisis
        </button>
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
