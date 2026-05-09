import { LoginButton } from "./login-button";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        {/* Wordmark Plasmart */}
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-bold tracking-[0.15em] text-primary">
            PLASMART
          </h1>
          <div className="mx-auto mt-3 h-px w-16 bg-accent" />
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-light">
            Reportería de Campañas
          </p>
        </div>

        {/* Card de login */}
        <div className="border border-border-default bg-white p-10">
          <h2 className="mb-2 text-xs uppercase tracking-[0.18em] text-light">
            Acceso interno
          </h2>
          <p className="mb-8 text-base text-steel">
            Ingresá con tu cuenta corporativa para ver el reporte semanal de
            performance.
          </p>

          <LoginButton />

          {error === "domain_not_allowed" && (
            <p className="mt-6 border-l-2 border-warning bg-cream px-4 py-3 text-sm text-warning">
              Solo cuentas <strong>@transfil.com.ar</strong> pueden acceder a
              este reporte.
            </p>
          )}

          {error === "auth_callback_failed" && (
            <p className="mt-6 border-l-2 border-warning bg-cream px-4 py-3 text-sm text-warning">
              Hubo un problema al iniciar sesión. Probá de nuevo.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs uppercase tracking-[0.15em] text-light">
          Plasmart · Grupo Transfil
        </p>
      </div>
    </main>
  );
}
