import Link from "next/link";

/**
 * Banner que se muestra cuando los filtros aplicados no devuelven datos
 * de campañas pagas. Reemplaza visualmente a los KPIs / gráficos / tabla
 * para evitar mostrar 4 ceros + 4 mensajes "sin datos" repetidos.
 *
 * No oculta la sección GA4 (se monta debajo igual) porque GA4 no se
 * filtra por publisher/type/campaign.
 */
export function EmptyStateBanner() {
  return (
    <div className="border border-border-default bg-white px-4 py-10 text-center sm:px-8 sm:py-12">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
        Sin datos
      </p>
      <h3 className="mt-3 text-xl font-bold tracking-tight text-primary">
        La combinación de filtros no devuelve resultados
      </h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-steel">
        Probá ampliar el rango de fechas o quitar algún filtro. La sección
        de Google Analytics no depende de estos filtros y sigue visible
        más abajo.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="
            inline-block border border-primary px-5 py-2.5
            text-[11px] font-semibold uppercase tracking-[0.18em] text-primary
            transition-colors duration-150 hover:bg-primary hover:text-white
          "
        >
          Limpiar filtros
        </Link>
      </div>
    </div>
  );
}
