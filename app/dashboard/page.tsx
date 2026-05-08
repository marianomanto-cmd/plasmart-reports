import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[#f5f5f0]">
      {/* Header */}
      <header className="border-b border-[#d0d0d0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <h1 className="text-xl font-bold tracking-[0.12em] text-[#1a1a1a]">
            PLASMART
            <span className="ml-3 text-xs font-medium uppercase tracking-[0.2em] text-[#8a8a8a]">
              Reportería
            </span>
          </h1>

          <div className="flex items-center gap-6">
            <span className="text-sm text-[#4a4a4a]">{user?.email}</span>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="
                  text-xs uppercase tracking-[0.15em] text-[#8a8a8a]
                  transition-colors duration-150 hover:text-[#1a1a1a]
                "
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <section className="mx-auto max-w-7xl px-8 py-16">
        <div className="border border-[#d0d0d0] bg-white p-12">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#8a8a8a]">
            Fase 3 completada
          </p>
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-[#1a1a1a]">
            Bienvenido, {user?.email?.split("@")[0]}.
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-[#4a4a4a]">
            La autenticación funciona correctamente. En la próxima fase vas a
            ver acá los KPIs de campañas, los filtros por fecha y publisher, y
            los gráficos de evolución.
          </p>

          <div className="mt-10 inline-block h-px w-16 bg-[#c9a961]" />

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="border-l-2 border-[#1a1a1a] pl-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8a8a8a]">
                Próximo paso
              </p>
              <p className="mt-2 text-sm text-[#4a4a4a]">
                Fase 4 — Dashboard de KPIs y filtros.
              </p>
            </div>
            <div className="border-l-2 border-[#1a1a1a] pl-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8a8a8a]">
                Datos
              </p>
              <p className="mt-2 text-sm text-[#4a4a4a]">
                Cargados desde Google Ads, Meta y GA4.
              </p>
            </div>
            <div className="border-l-2 border-[#1a1a1a] pl-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8a8a8a]">
                Análisis
              </p>
              <p className="mt-2 text-sm text-[#4a4a4a]">
                IA con Claude — Fase 5.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}