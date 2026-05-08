"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Resumen", href: "/dashboard" },
  { label: "Comparativa", href: "/dashboard/comparativa" },
  { label: "Detalle", href: "/dashboard/detalle" },
] as const;

/**
 * Sub-navegación dentro de /dashboard/* — tres pestañas.
 * El nav de nivel app (Dashboard / Admin) está en DashboardHeader.
 */
export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border-default bg-background">
      <nav
        aria-label="Pestañas del dashboard"
        className="mx-auto flex max-w-7xl gap-8 px-8"
      >
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
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
  );
}
