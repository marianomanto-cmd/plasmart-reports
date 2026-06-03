"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS: Array<{ href: string; label: string; match: (p: string) => boolean }> = [
  { href: "/dashboard", label: "Resumen", match: (p) => p === "/dashboard" },
  {
    href: "/dashboard/paid",
    label: "Campañas",
    match: (p) => p.startsWith("/dashboard/paid"),
  },
  {
    href: "/dashboard/traffic",
    label: "Tráfico",
    match: (p) => p.startsWith("/dashboard/traffic"),
  },
  {
    href: "/dashboard/analysis",
    label: "Análisis IA",
    match: (p) => p.startsWith("/dashboard/analysis"),
  },
];

/**
 * Navegación principal horizontal en el topbar (desktop). Reemplaza la
 * sidebar — el dashboard ahora es full-width con nav arriba, como el
 * mockup Control Room. Preserva los query params al navegar.
 */
export function TopNav() {
  const pathname = usePathname();
  const qs = useSearchParams().toString();
  const withQs = (h: string) => (qs ? `${h}?${qs}` : h);

  return (
    <nav
      className="hidden items-center gap-1 md:flex"
      aria-label="Navegación principal"
    >
      {ITEMS.map((it) => {
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={withQs(it.href)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-surface-2 text-foreground ring-1 ring-inset ring-white/10"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            {active && (
              <span className="mr-1.5 text-[10px] text-brand" aria-hidden="true">
                ◢
              </span>
            )}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
