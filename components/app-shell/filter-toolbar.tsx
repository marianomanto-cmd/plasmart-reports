"use client";

import { usePathname } from "next/navigation";

import { InlineFilters } from "@/components/inline-filters";
import type { Publisher } from "@/lib/types";

/**
 * Barra de filtros siempre visible, anclada debajo del header y alineada
 * al ancho del contenido. Reemplaza al drawer lateral: hay lugar de sobra
 * en pantalla, así que los filtros viven en la main screen en vez de
 * detrás de un modal.
 *
 * - Se oculta en /admin (esa vista no tiene filtros de período/scope).
 * - Deriva `lockedPublisher` de la ruta (/paid/gads, /paid/meta), igual
 *   que hacía el topbar.
 * - Vive en el AppShell (no en cada página), así persiste montada entre
 *   navegaciones de /dashboard/* y sólo re-fetchea las opciones cuando
 *   cambian fecha/publisher.
 */
export function FilterToolbar() {
  const pathname = usePathname();

  // Admin no usa filtros de dashboard.
  if (pathname.startsWith("/admin")) return null;

  const lockedPublisher: Publisher | undefined = pathname.endsWith("/paid/gads")
    ? "gads"
    : pathname.endsWith("/paid/meta")
      ? "meta"
      : undefined;

  return (
    <div className="border-b border-border bg-background/40">
      <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 lg:px-8">
        <InlineFilters lockedPublisher={lockedPublisher} />
      </div>
    </div>
  );
}
