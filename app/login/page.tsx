import { LoginButton } from "./login-button";
import { PlasmartMark } from "@/components/plasmart-mark";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Wordmark Plasmart */}
        <div className="mb-14 text-center">
          <PlasmartMark size={48} className="mx-auto mb-5" />
          <h1 className="text-5xl font-bold tracking-[0.15em] text-foreground">
            PLASMART
          </h1>
          <div className="mx-auto mt-3 h-px w-16 bg-brand" />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-light">
            Reportería de Campañas
          </p>
        </div>

        {/* Card de login */}
        <div className="surface-card glow-stripe relative overflow-hidden rounded-xl p-10">
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-light">
            Acceso interno
          </h2>
          <p className="mb-8 text-base text-steel">
            Ingresá con tu cuenta corporativa para ver el reporte de
            performance.
          </p>

          <LoginButton />

          {error === "domain_not_allowed" && (
            <p className="mt-6 rounded-md border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm text-warning">
              Solo cuentas <strong>@transfil.com.ar</strong> pueden acceder a
              este reporte.
            </p>
          )}

          {error === "auth_callback_failed" && (
            <p className="mt-6 rounded-md border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm text-warning">
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
