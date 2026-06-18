"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RiCalendar2Line, RiArrowDownSLine } from "@remixicon/react";

import { InlineFilters } from "@/components/inline-filters";
import { parseFilters } from "@/lib/filters";
import { DATE_RANGE_PRESETS, matchDatePreset } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Publisher } from "@/lib/types";

const fmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const short = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));

function rangeSummary(from: string, to: string): string {
  const preset = matchDatePreset(from, to);
  if (preset) return DATE_RANGE_PRESETS.find((p) => p.key === preset)?.label ?? "";
  return `${short(from)} — ${short(to)}`;
}

/**
 * Único control de filtros, anclado al chip de período del topbar (como
 * el dropdown del diseño). Al abrir despliega la `FiltersBar` completa en
 * un popover; reemplaza la barra de filtros que vivía siempre visible
 * (eran dos controles de período a la vez).
 */
export function FilterPopover() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(Object.fromEntries(searchParams.entries()));
  const wrapRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Admin no tiene filtros de período/scope: mostramos sólo la fecha, sin abrir.
  const isAdmin = pathname.startsWith("/admin");

  const lockedPublisher: Publisher | undefined = pathname.endsWith("/paid/gads")
    ? "gads"
    : pathname.endsWith("/paid/meta")
      ? "meta"
      : undefined;

  const summary = rangeSummary(filters.from, filters.to);

  if (isAdmin) {
    return (
      <div className="flex items-center gap-1.5 rounded-xl border border-[rgba(43,255,174,0.13)] bg-white/10 px-3 py-2 text-xs font-semibold text-foreground">
        <RiCalendar2Line className="size-3.5 text-light" aria-hidden="true" />
        <span className="font-data tabular-nums">{summary}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex items-center gap-1.5 rounded-xl border bg-white/10 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white/20",
          open ? "border-brand/50" : "border-[rgba(43,255,174,0.13)]",
        )}
      >
        <RiCalendar2Line className="size-3.5 text-light" aria-hidden="true" />
        <span className="font-data tabular-nums">{summary}</span>
        <RiArrowDownSLine
          className={cn("size-4 text-light transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          {/* Backdrop para click-outside */}
          <button
            type="button"
            aria-label="Cerrar filtros"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/30 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-label="Filtros"
            className="absolute right-0 top-full z-50 mt-2 max-h-[min(72vh,560px)] w-[min(92vw,640px)] overflow-y-auto rounded-[20px] bg-[#0a1712] shadow-[0_24px_60px_rgba(0,0,0,0.75)] ring-1 ring-[rgba(43,255,174,0.25)]"
          >
            <InlineFilters lockedPublisher={lockedPublisher} />
          </div>
        </>
      )}
    </div>
  );
}
