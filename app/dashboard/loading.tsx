// Skeleton del dashboard mientras se resuelven las queries server-side.
// El header NO se duplica acá: ya está montado en page.tsx, que se renderiza
// inmediatamente; solo la sección de datos espera.

export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 px-8 py-8">
        {/* Header del reporte (rango + comparación) */}
        <div className="space-y-2">
          <div className="h-3 w-44 animate-pulse bg-border-default" />
          <div className="h-7 w-72 animate-pulse bg-border-default" />
          <div className="h-3 w-56 animate-pulse bg-[#e5e5e0]" />
        </div>

        {/* Filtros */}
        <div className="-mx-8 border-b border-border-default bg-cream px-8 py-4">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-16 animate-pulse bg-border-default" />
                <div className="h-9 w-40 animate-pulse bg-[#e5e5e0]" />
              </div>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border-default bg-white p-6">
              <div className="mb-4 h-2.5 w-24 animate-pulse bg-border-default" />
              <div className="h-10 w-32 animate-pulse bg-[#e5e5e0]" />
              <div className="mt-4 h-3 w-40 animate-pulse bg-[#f0f0ea]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
