import { LoginButton } from "./login-button";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f0] px-6">
      <div className="w-full max-w-md">
        {/* Wordmark Plasmart */}
        <div className="mb-16 text-center">
          <h1
            className="text-5xl font-bold tracking-[0.15em] text-[#1a1a1a]"
            style={{ letterSpacing: "0.15em" }}
          >
            PLASMART
          </h1>
          <div className="mx-auto mt-3 h-px w-16 bg-[#c9a961]" />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#8a8a8a]">
            Reportería de Campañas
          </p>
        </div>

        {/* Card de login */}
        <div className="border border-[#d0d0d0] bg-white p-10">
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-[#8a8a8a]">
            Acceso interno
          </h2>
          <p className="mb-8 text-base text-[#4a4a4a]">
            Ingresá con tu cuenta corporativa para ver el reporte semanal de
            performance.
          </p>

          <LoginButton />

          {error === "domain_not_allowed" && (
            <p className="mt-6 border-l-2 border-[#b8704a] bg-[#fdf6f0] px-4 py-3 text-sm text-[#b8704a]">
              Solo cuentas <strong>@transfil.com.ar</strong> pueden acceder a
              este reporte.
            </p>
          )}

          {error === "auth_callback_failed" && (
            <p className="mt-6 border-l-2 border-[#b8704a] bg-[#fdf6f0] px-4 py-3 text-sm text-[#b8704a]">
              Hubo un problema al iniciar sesión. Probá de nuevo.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs uppercase tracking-[0.15em] text-[#8a8a8a]">
          Plasmart · Grupo Transfil
        </p>
      </div>
    </main>
  );
}