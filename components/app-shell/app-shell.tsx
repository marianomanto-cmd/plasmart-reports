import Link from "next/link";

import { PlasmartMark } from "@/components/plasmart-mark";
import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";
import { DrawerFilters } from "./drawer-filters";

interface Props {
  userEmail: string | null | undefined;
  /** Si true (default), el botón Filtros del topbar abre un drawer con
   *  la FiltersBar (auto-fetcheada). Sólo se pone en false para vistas
   *  que no aplican filtros (ej. /admin). */
  showFilters?: boolean;
  /** Etiqueta corta del rango activo (ej "16 may → 22 may"). */
  periodLabel?: string;
  children: React.ReactNode;
}

/**
 * Layout principal del dashboard: sidebar fija a la izquierda (desktop)
 * o accesible vía hamburger (mobile), topbar persistente, contenido a
 * la derecha. La altura es h-dvh para que el sidebar no scrollee.
 *
 * Mobile-first: sidebar oculta debajo de md, contenido ocupa todo el
 * ancho. Padding lateral del contenido reducido en mobile.
 */
export function AppShell({
  userEmail,
  showFilters = true,
  periodLabel,
  children,
}: Props) {
  const filtersSlot = showFilters ? <DrawerFilters /> : undefined;
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar desktop — oculta debajo de md */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="border-b border-sidebar-border px-4 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            aria-label="Plasmart Reportería — inicio"
          >
            <PlasmartMark size={24} />
            <span className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.12em] text-foreground">
                PLASMART
              </span>
              <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Reportería
              </span>
            </span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
          <SidebarNav />
        </div>
      </aside>

      {/* Contenido + topbar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userEmail={userEmail}
          filtersSlot={filtersSlot}
          periodLabel={periodLabel}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
