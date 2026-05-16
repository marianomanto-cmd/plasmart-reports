"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AnalysisGranularity } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  current: AnalysisGranularity;
  /** Nombre del query param. Default: "granularity". */
  paramName?: string;
}

const OPTIONS: Array<{ g: AnalysisGranularity; label: string }> = [
  { g: "campaign", label: "Campañas" },
  { g: "adset", label: "Ad groups" },
  { g: "ad", label: "Ads" },
];

/**
 * Pills para elegir la granularidad de la vista. Escribe el valor en
 * la URL (`?granularity=adset`) preservando los demás query params.
 *
 * Mobile: las 3 pills se distribuyen en 3 columnas iguales (full width
 * del contenedor padre). Desktop: pills compactas inline.
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
      next.delete(paramName);
    } else {
      next.set(paramName, g);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="eyebrow-xs">Granularidad</span>
      <div
        role="radiogroup"
        aria-label="Granularidad de la vista"
        className="grid grid-cols-3 gap-1 rounded-md border border-border bg-card p-0.5 sm:inline-grid sm:w-auto"
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
              className={cn(
                "rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                isSelected
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {isPending && (
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Actualizando…
        </span>
      )}
    </div>
  );
}
