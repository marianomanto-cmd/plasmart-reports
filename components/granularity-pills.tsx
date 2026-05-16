"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AnalysisGranularity } from "@/lib/types";

interface Props {
  current: AnalysisGranularity;
  /** Nombre del query param. Default: "granularity". */
  paramName?: string;
}

const OPTIONS: Array<{ g: AnalysisGranularity; label: string; sub: string }> = [
  { g: "campaign", label: "Campañas", sub: "Todos los publishers" },
  { g: "adset", label: "Ad groups", sub: "Datos disponibles cuando hay ingesta" },
  { g: "ad", label: "Ads", sub: "Datos disponibles cuando hay ingesta" },
];

/**
 * Pills para elegir la granularidad de la vista. Escribe el valor en la
 * URL (`?granularity=adset`) preservando los demás query params, así el
 * link es compartible y el back del browser recupera el estado.
 */
export function GranularityPills({
  current,
  paramName = "granularity",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setGranularity = (g: AnalysisGranularity) => {
    const next = new URLSearchParams(searchParams.toString());
    if (g === "campaign") {
      next.delete(paramName); // default: limpia la URL
    } else {
      next.set(paramName, g);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow-xs mr-1">Granularidad</span>
      <div
        role="radiogroup"
        aria-label="Granularidad de la vista"
        className="flex flex-wrap gap-1"
      >
        {OPTIONS.map((o) => {
          const isSelected = current === o.g;
          return (
            <button
              key={o.g}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setGranularity(o.g)}
              className={`
                inline-flex items-center gap-2 border px-3 py-1.5
                text-xs font-semibold uppercase tracking-[0.12em]
                transition-colors duration-150
                ${
                  isSelected
                    ? "border-brand bg-brand-soft text-primary"
                    : "border-border-default bg-white text-steel hover:border-brand hover:text-primary"
                }
              `}
              title={o.sub}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {isPending && (
        <span className="eyebrow-xs text-light">Actualizando…</span>
      )}
    </div>
  );
}
