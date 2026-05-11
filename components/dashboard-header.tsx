import Link from "next/link";

interface Props {
  userEmail: string | null | undefined;
  /** Sección activa, para resaltar el link correspondiente. */
  active?: "dashboard" | "admin";
}

export function DashboardHeader({ userEmail, active = "dashboard" }: Props) {
  return (
    <header className="border-b border-border-default bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-10">
          <h1 className="text-base font-bold tracking-[0.12em] text-primary sm:text-xl">
            PLASMART
            <span className="ml-2 hidden text-xs font-medium uppercase tracking-[0.2em] text-light sm:inline sm:ml-3">
              Reportería
            </span>
          </h1>

          <nav className="flex items-center gap-4 sm:gap-6">
            <NavLink href="/dashboard" isActive={active === "dashboard"}>
              Reporte
            </NavLink>
            <NavLink href="/admin" isActive={active === "admin"}>
              Admin
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {userEmail && (
            <span className="hidden max-w-[180px] truncate text-sm text-steel sm:inline lg:max-w-none">
              {userEmail}
            </span>
          )}
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
