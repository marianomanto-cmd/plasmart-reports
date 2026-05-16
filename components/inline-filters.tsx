"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FiltersBar } from "@/components/filters-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { parseFilters } from "@/lib/filters";
import type { AvailableFilters } from "@/lib/types";

/**
 * FiltersBar para usar inline al tope de cada página, auto-fetcheando
 * las opciones disponibles desde la API. Sin prop drilling desde el
 * server component.
 */
export function InlineFilters() {
  const searchParams = useSearchParams();
  const filters = parseFilters(Object.fromEntries(searchParams.entries()));

  const [available, setAvailable] = useState<AvailableFilters | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set("from", filters.from);
    params.set("to", filters.to);
    if (filters.publisher) params.set("publisher", filters.publisher);

    fetch(`/api/filters/available?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else {
          setAvailable(data as AvailableFilters);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.from, filters.to, filters.publisher]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-card p-3 text-sm text-destructive">
        No pudimos cargar los filtros: {error}
      </div>
    );
  }

  if (!available) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <FiltersBar filters={filters} available={available} />;
}
