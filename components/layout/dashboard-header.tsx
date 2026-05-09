import Link from "next/link";

interface Props {
  userEmail: string | null | undefined;
  /** Sección activa, para resaltar el link correspondiente. */
  active?: "dashboard" | "admin";
}

export function DashboardHeader({ userEmail, active = "dashboard" }: Props) {
  return (
    <header className="border-b border-border-default bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
        <div className="flex items-center gap-10">
          <Link href="/dashboard" className="flex items-baseline gap-3">
            <h1 className="text-xl font-bold tracking-[0.15em] text-primary">
              PLASMART
            </h1>
            <span className="h-px w-6 bg-accent" aria-hidden="true" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-light">
              Reportería
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <NavLink href="/dashboard" isActive={active === "dashboard"}>
              Reporte
            </NavLink>
            <NavLink href="/admin" isActive={active === "admin"}>
              Admin
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          {userEmail && <span className="text-sm text-steel">{userEmail}</span>}
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="
                text-xs uppercase tracking-[0.15em] text-light
                transition-colors duration-150 hover:text-primary
              "
            >
              Salir
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
