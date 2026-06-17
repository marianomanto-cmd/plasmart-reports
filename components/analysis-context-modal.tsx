"use client";

// Modal de edición del contexto de análisis.
// Se abre desde los cards de "Análisis de Claude" y "Reporte Corey Haines".
// Tiene 10 preguntas agrupadas en 3 bloques (estable / foco / reglas),
// cada una con una frase de orientación arriba del textarea.
//
// El modal hace su propia carga (GET /api/analysis-context) cuando se abre
// por primera vez y persiste con PUT al guardar. No tira: si la query
// falla, muestra un estado de error y permite reintentar.

import { useEffect, useId, useState } from "react";
import type { AnalysisContext } from "@/lib/types";
import { Button } from "@/components/tremor/button";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Notifica al padre que el contexto cambió (útil para invalidar UI). */
  onSaved?: (ctx: AnalysisContext) => void;
}

interface Field {
  key: keyof Pick<
    AnalysisContext,
    | "company"
    | "audience"
    | "economics"
    | "tracking"
    | "focus"
    | "decision"
    | "businessContext"
    | "scope"
    | "rules"
    | "outputTone"
  >;
  question: string;
  guidance: string;
  rows: number;
}

interface Section {
  title: string;
  subtitle: string;
  fields: Field[];
}

const SECTIONS: Section[] = [
  {
    title: "Contexto estable",
    subtitle: "Cambia rara vez. Define quién es Plasmart y cómo se mide.",
    fields: [
      {
        key: "company",
        question: "¿Qué hace la empresa y cuál es su diferencial técnico?",
        guidance:
          "Capacidades concretas que limitan o habilitan demanda: espesores de corte, materiales, plazos de entrega, ubicación geográfica.",
        rows: 3,
      },
      {
        key: "audience",
        question: "¿Qué segmentos atendés y cómo se diferencian comercialmente?",
        guidance:
          'Separá B2B y B2C con su valor relativo. Ej.: "Un lead B2B vale órdenes de magnitud más que uno B2C."',
        rows: 3,
      },
      {
        key: "economics",
        question: "¿Cuál es la economía base?",
        guidance:
          "Moneda, presupuesto semanal típico, CPA aceptable por segmento, márgenes. Rangos, no exactos.",
        rows: 3,
      },
      {
        key: "tracking",
        question: "¿Qué tracking y cuentas están activas?",
        guidance:
          "GAds, Meta, GA4, qué conversiones se trackean y cuáles no. Evita que Claude recomiende mirar métricas que no existen.",
        rows: 2,
      },
    ],
  },
  {
    title: "Foco de este análisis",
    subtitle: "Cambia seguido. Lo más importante para orientar el reporte.",
    fields: [
      {
        key: "focus",
        question: "¿Cuál es el objetivo prioritario este período?",
        guidance:
          'Una sola frase. Ej.: "Bajar CPA en Meta sin perder volumen de leads B2B" o "Validar si la campaña de plegado CNC genera demanda industrial real."',
        rows: 2,
      },
      {
        key: "decision",
        question: "¿Qué decisión vas a tomar con este análisis?",
        guidance:
          'Ej.: "Redistribuir presupuesto entre publishers", "Pausar o escalar campañas puntuales", "Planificar tests para la próxima quincena".',
        rows: 2,
      },
      {
        key: "businessContext",
        question: "¿Hay contexto del negocio que cambie cómo leer los datos?",
        guidance:
          "Estacionalidad (verano bajo, Q4 fuerte), lanzamientos, cambios de precio, eventos, cambios en el sitio.",
        rows: 2,
      },
      {
        key: "scope",
        question: "¿Hay campañas, productos o canales en foco o que ignorar?",
        guidance:
          'Nombres concretos. Ej.: "Foco en campañas de plegado CNC", "Ignorar remarketing por ahora", "Priorizar Meta sobre Google esta semana".',
        rows: 2,
      },
    ],
  },
  {
    title: "Reglas y tono",
    subtitle: "Opcional. Restricciones duras y preferencias de formato.",
    fields: [
      {
        key: "rules",
        question: "¿Reglas duras a respetar?",
        guidance:
          'Ej.: "No recomendar pausar campañas con menos de 7 días", "Priorizar tests baratos antes que aumentar presupuesto".',
        rows: 2,
      },
      {
        key: "outputTone",
        question: "¿Tono o profundidad preferida del output?",
        guidance:
          'Ej.: "Más ejecutivo, menos detalle táctico" o al revés. Por defecto se mantienen los formatos actuales.',
        rows: 2,
      },
    ],
  },
];

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; ctx: AnalysisContext }
  | { kind: "error"; message: string };

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export function AnalysisContextModal({ open, onClose, onSaved }: Props) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [draft, setDraft] = useState<Partial<AnalysisContext>>({});

  // Cargar el contexto cuando el modal se abre.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Reset intencional al abrir el modal: descartamos el estado de la
    // apertura anterior antes de re-fetchear. Es el caso legítimo de
    // "reset al cambiar una prop", por eso silenciamos la regla acá.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadState({ kind: "loading" });
    setSaveState({ kind: "idle" });
    (async () => {
      try {
        const res = await fetch("/api/analysis-context", { cache: "no-store" });
        const json = (await res.json()) as
          | { context: AnalysisContext }
          | { error: string };
        if (cancelled) return;
        if (!res.ok || "error" in json) {
          const msg = "error" in json ? json.error : `HTTP ${res.status}`;
          setLoadState({ kind: "error", message: msg });
          return;
        }
        setLoadState({ kind: "ready", ctx: json.context });
        setDraft(json.context);
      } catch (err) {
        if (cancelled) return;
        setLoadState({ kind: "error", message: (err as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && saveState.kind !== "saving") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, saveState.kind]);

  const update = (key: Field["key"]) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }));
  };

  const save = async () => {
    setSaveState({ kind: "saving" });
    try {
      const res = await fetch("/api/analysis-context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: draft.company ?? "",
          audience: draft.audience ?? "",
          economics: draft.economics ?? "",
          tracking: draft.tracking ?? "",
          focus: draft.focus ?? "",
          decision: draft.decision ?? "",
          businessContext: draft.businessContext ?? "",
          scope: draft.scope ?? "",
          rules: draft.rules ?? "",
          outputTone: draft.outputTone ?? "",
        }),
      });
      const json = (await res.json()) as
        | { context: AnalysisContext }
        | { error: string };
      if (!res.ok || "error" in json) {
        const msg = "error" in json ? json.error : `HTTP ${res.status}`;
        setSaveState({ kind: "error", message: msg });
        return;
      }
      setSaveState({ kind: "idle" });
      onSaved?.(json.context);
      onClose();
    } catch (err) {
      setSaveState({ kind: "error", message: (err as Error).message });
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-context-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-12"
      onClick={(e) => {
        if (e.target === e.currentTarget && saveState.kind !== "saving") onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-card shadow-xl">
        <header className="border-b border-border-default px-8 py-6">
          <h2
            id="analysis-context-title"
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary"
          >
            Contexto del análisis
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
            Definí qué necesita saber Claude (y Corey Haines) para hacer un buen
            análisis. Estos campos se inyectan en cada generación. Cambialos
            cuando cambien tus objetivos o el contexto del negocio.
          </p>
        </header>

        <div className="max-h-[60vh] overflow-y-auto px-8 py-6">
          {loadState.kind === "loading" && (
            <div className="space-y-3 py-4">
              <div className="h-3 w-2/5 animate-pulse bg-white/10" />
              <div className="h-20 w-full animate-pulse bg-white/5" />
              <div className="h-3 w-1/3 animate-pulse bg-white/10" />
              <div className="h-20 w-full animate-pulse bg-white/5" />
            </div>
          )}

          {loadState.kind === "error" && (
            <p className="py-6 text-sm text-warning">
              No pudimos cargar el contexto: {loadState.message}
            </p>
          )}

          {loadState.kind === "ready" && (
            <div className="space-y-10">
              {SECTIONS.map((section) => (
                <section key={section.title} className="space-y-5">
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-xs text-light">{section.subtitle}</p>
                  </div>
                  <div className="space-y-6">
                    {section.fields.map((f) => (
                      <FieldRow
                        key={f.key}
                        field={f}
                        value={draft[f.key] ?? ""}
                        onChange={update(f.key)}
                        disabled={saveState.kind === "saving"}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-border-default bg-cream px-8 py-4">
          <div className="min-h-[18px] text-xs text-warning">
            {saveState.kind === "error" ? `Error al guardar: ${saveState.message}` : ""}
            {loadState.kind === "ready" && saveState.kind !== "error" && (
              <span className="text-light">
                Última edición: {formatUpdated(loadState.ctx.updatedAt)}
                {loadState.ctx.updatedBy ? ` · ${loadState.ctx.updatedBy}` : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saveState.kind === "saving"}
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={save}
              isLoading={saveState.kind === "saving"}
              loadingText="Guardando…"
              disabled={loadState.kind !== "ready"}
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            >
              Guardar contexto
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  disabled,
}: {
  field: Field;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-semibold leading-snug text-primary"
      >
        {field.question}
      </label>
      <p className="text-xs leading-relaxed text-light">{field.guidance}</p>
      <textarea
        id={id}
        rows={field.rows}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="
          w-full resize-y border border-border-default bg-card px-3 py-2
          text-sm leading-relaxed text-primary
          focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20
          disabled:bg-secondary
        "
      />
    </div>
  );
}

function formatUpdated(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Cordoba",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
