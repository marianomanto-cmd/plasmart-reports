import Link from "next/link";
import { RiFilter3Line } from "@remixicon/react";
import { Card } from "@/components/tremor/card";

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
    <Card className="px-4 py-10 text-center sm:px-8 sm:py-12">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
        <RiFilter3Line className="size-5 text-brand" aria-hidden="true" />
      </div>
      <p className="mt-4 eyebrow-xs">Sin datos</p>
      <h3 className="mt-2 text-xl font-bold tracking-tight text-primary">
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
            inline-block rounded-md border border-primary px-5 py-2.5
            text-[11px] font-semibold uppercase tracking-[0.18em] text-primary
            transition-colors duration-150 hover:bg-primary hover:text-white
          "
        >
          Limpiar filtros
        </Link>
      </div>
    </Card>
  );
}
