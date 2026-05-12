import { LoginButton } from "./login-button";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6">
      <div className="w-full max-w-md">
        {/* Wordmark Plasmart */}
        <div className="mb-16 text-center">
          <h1
            className="text-5xl font-bold tracking-[0.15em] text-[#0f172a]"
            style={{ letterSpacing: "0.15em" }}
          >
            PLASMART
          </h1>
          <div className="mx-auto mt-3 h-px w-16 bg-[#2563eb]" />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#94a3b8]">
            Reportería de Campañas
          </p>
        </div>

        {/* Card de login */}
        <div className="border border-[#e2e8f0] bg-white p-10">
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-[#94a3b8]">
            Acceso interno
          </h2>
          <p className="mb-8 text-base text-[#475569]">
            Ingresá con tu cuenta corporativa para ver el reporte semanal de
            performance.
          </p>

          <LoginButton />

          {error === "domain_not_allowed" && (
            <p className="mt-6 border-l-2 border-[#d97706] bg-[#fef3c7] px-4 py-3 text-sm text-[#d97706]">
              Solo cuentas <strong>@transfil.com.ar</strong> pueden acceder a
              este reporte.
            </p>
          )}

          {error === "auth_callback_failed" && (
            <p className="mt-6 border-l-2 border-[#d97706] bg-[#fef3c7] px-4 py-3 text-sm text-[#d97706]">
              Hubo un problema al iniciar sesión. Probá de nuevo.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs uppercase tracking-[0.15em] text-[#94a3b8]">
          Plasmart · Grupo Transfil
        </p>
      </div>
    </main>
  );
}