"use client";

import { useState } from "react";
import { RiFlashlightLine, RiSparkling2Line } from "@remixicon/react";

import type { DashboardFilters } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AiAnalysis } from "@/components/ai-analysis";
import { CoreyHainesAnalysis } from "@/components/corey-haines-analysis";

type Mode = "quick" | "expert";

const MODES: Array<{
  id: Mode;
  label: string;
  desc: string;
  icon: typeof RiFlashlightLine;
}> = [
  {
    id: "quick",
    label: "Diagnóstico rápido",
    desc: "Análisis breve con recomendaciones puntuales del período.",
    icon: RiFlashlightLine,
  },
  {
    id: "expert",
    label: "Reporte experto Corey Haines",
    desc: "Frameworks de marketing skills aplicados al período. Más extenso, ~30-60 seg.",
    icon: RiSparkling2Line,
  },
];

interface Props {
  filters: DashboardFilters;
}

/**
 * Hub que unifica los dos modos de análisis IA en una sola vista,
 * con toggle entre ellos. Reusa los componentes existentes
 * (AiAnalysis y CoreyHainesAnalysis) sin tocar su lógica.
 */
export function AnalysisHub({ filters }: Props) {
  const [mode, setMode] = useState<Mode>("quick");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={active}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                active
                  ? "border-foreground bg-card shadow-sm"
                  : "border-border bg-card/60 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-brand" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-sm font-semibold",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {m.label}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {m.desc}
              </p>
            </button>
          );
        })}
      </div>

      {mode === "quick" ? (
        <AiAnalysis filters={filters} />
      ) : (
        <CoreyHainesAnalysis filters={filters} />
      )}
    </div>
  );
}
