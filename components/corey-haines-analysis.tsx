"use client";

import { useState } from "react";
import { RiSparkling2Line } from "@remixicon/react";
import type { AnalysisGranularity, DashboardFilters } from "@/lib/types";
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
  const [focus, setFocus] = useState("");
  const [granularity, setGranularity] =
    useState<AnalysisGranularity>("campaign");
  const [modalOpen, setModalOpen] = useState(false);

  const run = async (forceRegenerate: boolean) => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/corey-haines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: filtersToParams(filters),
          forceRegenerate,
          focusOverride: focus.trim() || undefined,
          granularity,
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
    <div className="border-t-4 border-brand bg-white">
      <div className="flex items-baseline justify-between border-b border-border-default px-4 py-4 sm:px-6">
        <div>
          <h3 className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <RiSparkling2Line className="size-4 text-brand" aria-hidden="true" />
            Reporte Corey Haines
          </h3>
          <p className="mt-0.5 text-[11px] text-light">
            {ACTIVE_SKILLS.length} skills aplicadas al período
          </p>
        </div>
        <Status state={state} />
      </div>

      <div className="px-4 py-6 sm:px-6">
        {state.kind === "idle" && (
          <Idle
            focus={focus}
            onFocusChange={setFocus}
            granularity={granularity}
            onGranularityChange={setGranularity}
            onRun={() => run(false)}
            onOpenModal={() => setModalOpen(true)}
          />
        )}
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
  granularity,
  onGranularityChange,
  onRun,
  onOpenModal,
}: {
  focus: string;
  onFocusChange: (v: string) => void;
  granularity: AnalysisGranularity;
  onGranularityChange: (g: AnalysisGranularity) => void;
  onRun: () => void;
  onOpenModal: () => void;
}) {
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

      {/* Selector de granularidad — aplicable a ambos publishers */}
      <GranularityPicker
        value={granularity}
        onChange={onGranularityChange}
      />

      <div className="w-full max-w-2xl space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="corey-focus-input"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"
          >
            Foco de este reporte (opcional)
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
          id="corey-focus-input"
          rows={2}
          value={focus}
          onChange={(e) => onFocusChange(e.target.value)}
          placeholder="Ej.: decidir si escalar campañas de plegado CNC o redistribuir a Search"
          className="
            w-full resize-y border border-border-default bg-white px-3 py-2
            text-sm leading-relaxed text-primary
            focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20
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
        Generar reporte
      </Button>
    </div>
  );
}

function GranularityPicker({
  value,
  onChange,
}: {
  value: AnalysisGranularity;
  onChange: (g: AnalysisGranularity) => void;
}) {
  const options: Array<{
    g: AnalysisGranularity;
    label: string;
    sub: string;
  }> = [
    { g: "campaign", label: "Campaña", sub: "Vista por campañas" },
    { g: "adset", label: "Ad group", sub: "GAds + Meta" },
    { g: "ad", label: "Ad", sub: "GAds + Meta" },
  ];

  return (
    <div className="w-full max-w-2xl space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        Granularidad del análisis
      </p>
      <div
        role="radiogroup"
        aria-label="Granularidad del análisis"
        className="flex flex-wrap gap-2"
      >
        {options.map((o) => {
          const isSelected = value === o.g;
          return (
            <button
              key={o.g}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(o.g)}
              className={`
                flex flex-col items-start gap-0.5 border px-3 py-2 text-left
                transition-colors duration-150
                ${
                  isSelected
                    ? "border-brand bg-brand-soft text-primary"
                    : "border-border-default bg-white text-primary hover:border-brand"
                }
              `}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                {o.label}
              </span>
              <span className="text-[10px] text-light">{o.sub}</span>
            </button>
          );
        })}
      </div>
      {value !== "campaign" && (
        <p className="text-xs text-light">
          Si no hay datos ingestados de {value === "adset" ? "ad groups" : "ads"}
          {" "}para el publisher elegido en este período, el reporte lo
          declara explícitamente y cae a nivel campaña.
        </p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <div className="h-4 w-2/5 animate-pulse bg-border-default" />
        <div className="h-3 w-full animate-pulse bg-border-soft" />
        <div className="h-3 w-11/12 animate-pulse bg-border-soft" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-4 w-1/3 animate-pulse bg-border-default" />
        <div className="h-3 w-full animate-pulse bg-border-soft" />
        <div className="h-3 w-10/12 animate-pulse bg-border-soft" />
        <div className="h-3 w-9/12 animate-pulse bg-border-soft" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full animate-pulse bg-border-soft" />
        <div className="h-3 w-11/12 animate-pulse bg-border-soft" />
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
  onRegenerate,
}: {
  data: ApiResponse;
  filters: DashboardFilters;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      <ReportMarkdown text={data.content} />

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
          Regenerar reporte
        </button>
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
