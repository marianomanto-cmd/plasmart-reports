"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RiFilter3Line, RiCalendarLine } from "@remixicon/react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { InlineFilters } from "@/components/inline-filters";
import { parseFilters } from "@/lib/filters";
import type { Publisher } from "@/lib/types";

const fmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const short = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));

/**
 * Chip de período + botón "Filtros" en el topbar, que abre un drawer
 * lateral con la FiltersBar. Reemplaza el panel de filtros inline que
 * vivía en cada página (volvemos al patrón del mockup Control Room).
 * El `lockedPublisher` se deriva de la ruta (/paid/gads, /paid/meta).
 */
export function TopbarFilters() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(Object.fromEntries(searchParams.entries()));

  const lockedPublisher: Publisher | undefined = pathname.endsWith(
    "/paid/gads",
  )
    ? "gads"
    : pathname.endsWith("/paid/meta")
      ? "meta"
      : undefined;

  const compareLabel =
    filters.compare === "yoy"
      ? "vs año ant."
      : filters.compare === "previous"
        ? "vs período ant."
        : "sin comparación";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Chip de período (desktop) — también abre el drawer */}
      <SheetTrigger asChild>
        <button
          type="button"
          className="hidden items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-steel transition-colors hover:border-brand/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:inline-flex"
          aria-label="Cambiar período y filtros"
        >
          <RiCalendarLine className="size-3.5 text-light" aria-hidden="true" />
          <span className="font-data tabular-nums text-foreground">
            {short(filters.from)} – {short(filters.to)}
          </span>
          <span className="text-light">· {compareLabel}</span>
        </button>
      </SheetTrigger>

      {/* Botón Filtros (todas las medidas) */}
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-brand/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Abrir filtros"
        >
          <RiFilter3Line className="size-4 text-brand" aria-hidden="true" />
          <span className="hidden sm:inline">Filtros</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[90%] max-w-md overflow-y-auto border-l border-sidebar-border bg-sidebar"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-sm text-foreground">
            <RiFilter3Line className="size-4 text-brand" aria-hidden="true" />
            Filtros
          </SheetTitle>
        </SheetHeader>
        <InlineFilters lockedPublisher={lockedPublisher} />
      </SheetContent>
    </Sheet>
  );
}
