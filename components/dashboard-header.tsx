interface Props {
  userEmail: string | null | undefined;
}

export function DashboardHeader({ userEmail }: Props) {
  return (
    <header className="border-b border-border-default bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
        <h1 className="text-xl font-bold tracking-[0.12em] text-primary">
          PLASMART
          <span className="ml-3 text-xs font-medium uppercase tracking-[0.2em] text-light">
            Reportería
          </span>
        </h1>

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
