"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  RiLogoutBoxRLine,
  RiSettings3Line,
  RiNotification3Line,
  RiCalendar2Line,
} from "@remixicon/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseFilters } from "@/lib/filters";
import { DATE_RANGE_PRESETS, matchDatePreset } from "@/lib/dates";
import { BRAND_EYEBROW, sectionMeta } from "./nav-items";

interface Props {
  userEmail: string | null | undefined;
}

const fmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const short = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));

function rangeSummary(from: string, to: string): string {
  const preset = matchDatePreset(from, to);
  if (preset) {
    return DATE_RANGE_PRESETS.find((p) => p.key === preset)?.label ?? "";
  }
  return `${short(from)} — ${short(to)}`;
}

/**
 * Topbar vidriado (Reactor Neon): eyebrow de marca + título/subtítulo de
 * la sección (derivados de la ruta) + chip de período + campana + avatar.
 * La navegación vive en el rail (desktop) / bottom-nav (mobile); los
 * filtros viven en la barra de abajo. Apila en mobile.
 */
export function Topbar({ userEmail }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(Object.fromEntries(searchParams.entries()));
  const { title, subtitle } = sectionMeta(pathname);

  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .split(/[._-]/)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "U"
    : "U";

  return (
    <header className="glass sticky top-4 z-30 rounded-[24px] px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="eyebrow-sm">{BRAND_EYEBROW}</div>
          <h1 className="mt-1.5 truncate text-2xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-0.5 truncate text-sm text-steel">{subtitle}</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          {/* Chip de período (informativo; los filtros viven abajo) */}
          <div className="flex items-center gap-2 rounded-2xl border border-[rgba(43,255,174,0.13)] bg-white/10 px-3.5 py-2.5 text-[13px] font-semibold text-foreground">
            <RiCalendar2Line className="size-4 text-light" aria-hidden="true" />
            <span className="font-data tabular-nums">
              {rangeSummary(filters.from, filters.to)}
            </span>
          </div>

          <button
            type="button"
            aria-label="Notificaciones"
            className="relative flex size-[42px] items-center justify-center rounded-2xl border border-[rgba(43,255,174,0.13)] bg-white/10 text-foreground transition-colors hover:bg-white/20"
          >
            <RiNotification3Line className="size-5" aria-hidden="true" />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[var(--color-plasma)] ring-2 ring-[rgba(8,20,15,0.8)]" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Menú de usuario"
                className="neon-gradient flex size-[42px] items-center justify-center rounded-full text-sm font-bold ring-2 ring-white/30"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {userEmail && (
                <>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Sesión</span>
                      <span className="truncate text-sm font-medium">
                        {userEmail}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer">
                  <RiSettings3Line className="size-4" />
                  Admin
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action="/auth/logout" method="post">
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full cursor-pointer">
                    <RiLogoutBoxRLine className="size-4" />
                    Cerrar sesión
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
