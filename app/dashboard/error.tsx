"use client";

import { useEffect } from "react";

/**
 * Error boundary del segmento /dashboard. Se monta cuando alguna de las
 * queries del Server Component falla (Promise.all rechaza). Mantiene el
 * mismo lenguaje visual que EmptyStateBanner: card crema-blanco con eyebrow,
 * heading y CTA.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] error boundary capturó:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-8 py-16">
        <div className="border border-border-default bg-white px-8 py-12 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warning">
            Error al cargar el reporte
          </p>
          <h3 className="mt-3 text-xl font-bold tracking-tight text-primary">
            No pudimos traer los datos del período
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-steel">
            Probá reintentar. Si el error persiste, revisá la sección{" "}
            <span className="font-medium text-primary">Admin</span> para ver el
            estado de las últimas ingestas.
          </p>
          {error.digest && (
            <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-light tabular-nums">
              Ref: {error.digest}
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="
                border border-primary bg-primary px-5 py-2.5
                text-[11px] font-semibold uppercase tracking-[0.18em] text-white
                transition-colors duration-150 hover:bg-white hover:text-primary
              "
            >
              Reintentar
            </button>
            <a
              href="/admin"
              className="
                text-[11px] font-semibold uppercase tracking-[0.18em] text-light
                transition-colors duration-150 hover:text-primary
              "
            >
              Ver estado de ingestas
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
