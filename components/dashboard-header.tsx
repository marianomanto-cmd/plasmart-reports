import Link from "next/link";
import { RiLogoutBoxRLine } from "@remixicon/react";
import { PlasmartMark } from "@/components/plasmart-mark";

interface Props {
  userEmail: string | null | undefined;
  /** Sección activa, para resaltar el link correspondiente. */
  active?: "dashboard" | "admin";
}

export function DashboardHeader({ userEmail, active = "dashboard" }: Props) {
  return (
    <header className="border-b border-border-default bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-6 sm:px-8 sm:py-4">
        <div className="flex min-w-0 items-center gap-4 sm:gap-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-opacity duration-150 hover:opacity-80 sm:gap-3"
            aria-label="Plasmart Reportería — inicio"
          >
            <PlasmartMark size={26} />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[15px] font-bold tracking-[0.12em] text-primary">
                PLASMART
              </span>
              <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-light">
                Reportería
              </span>
            </span>
            <span className="text-sm font-bold tracking-[0.12em] text-primary sm:hidden">
              PLASMART
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <NavLink href="/dashboard" isActive={active === "dashboard"}>
              Reporte
            </NavLink>
            <NavLink href="/admin" isActive={active === "admin"}>
              Admin
            </NavLink>
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          {userEmail && (
            <span
              className="hidden min-w-0 max-w-[180px] truncate text-sm text-steel md:inline"
              title={userEmail}
            >
              {userEmail}
            </span>
          )}
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="
                inline-flex items-center gap-1.5 whitespace-nowrap
                text-xs font-medium text-light
                transition-colors duration-150 hover:text-primary
              "
              title="Cerrar sesión"
            >
              <RiLogoutBoxRLine className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`
        text-xs font-semibold uppercase tracking-[0.18em]
        transition-colors duration-150
        ${isActive ? "text-primary" : "text-light hover:text-primary"}
      `}
    >
      {children}
    </Link>
  );
}
