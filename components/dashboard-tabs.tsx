"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { label: "Resumen", href: "/dashboard" },
  { label: "Comparativa", href: "/dashboard/comparativa" },
  { label: "Detalle", href: "/dashboard/detalle" },
  { label: "Corey Haines", href: "/dashboard/corey-haines" },
] as const;

/**
 * Sub-navegación dentro de /dashboard/* — mantiene los filtros de la URL
 * al cambiar de pestaña, así el rango de fechas y demás filtros se preservan.
 */
export function DashboardTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  return (
    <div className="border-b border-border-default bg-background">
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Pestañas del dashboard"
          className="flex gap-5 whitespace-nowrap sm:gap-8"
        >
          {TABS.map((tab) => {
            const isActive =
              tab.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(tab.href);
            const href = qs ? `${tab.href}?${qs}` : tab.href;
            return (
              <Link
                key={tab.href}
                href={href}
                className={`
                  relative py-4 text-[11px] font-semibold uppercase tracking-[0.18em]
                  transition-colors duration-150
                  ${isActive ? "text-primary" : "text-light hover:text-primary"}
                `}
              >
                {tab.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-px bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
