import Link from "next/link";

import { PlasmartMark } from "@/components/plasmart-mark";
import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

interface Props {
  userEmail: string | null | undefined;
  children: React.ReactNode;
}

/**
 * Layout principal del dashboard: sidebar fija a la izquierda (desktop)
 * o accesible vía hamburger (mobile), topbar persistente, contenido a
 * la derecha. Los filtros viven inline en cada page (no en este shell).
 */
export function AppShell({ userEmail, children }: Props) {
  return (
    <div className="flex min-h-dvh bg-background">
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

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
