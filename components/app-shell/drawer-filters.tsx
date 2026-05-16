"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FiltersBar } from "@/components/filters-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { parseFilters } from "@/lib/filters";
import type { AvailableFilters } from "@/lib/types";

/**
 * Wrapper de la FiltersBar para vivir adentro del drawer del topbar.
 * Auto-fetchea los `available` desde la API (en vez de recibirlos por
 * prop como en el patrón original SSR). Lee los filters actuales desde
 * la URL.
 */
export function DrawerFilters() {
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
        if (data.error) {
          setError(data.error);
        } else {
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
      <p className="text-sm text-destructive">
        No pudimos cargar las opciones de filtros: {error}
      </p>
    );
  }

  if (!available) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return <FiltersBar filters={filters} available={available} />;
}
