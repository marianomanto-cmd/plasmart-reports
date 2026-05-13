// Hash MD5 estable para usar como clave de cache en ai_analysis_cache.
// Web Crypto API no expone MD5 (por seguridad), pero MD5 está bien acá:
// no es un hash de seguridad, es solo una clave de cache. Usamos SHA-256
// truncado, que es nativo en Node y mucho más simple que traer una lib.

import { createHash } from "crypto";
import type { DashboardFilters } from "@/lib/types";

/**
 * Genera un hash determinístico de los filtros del dashboard.
 * Mismos filtros → mismo hash. Cambia cualquier filtro → hash distinto.
 *
 * El namespace separa caches que comparten la tabla pero responden a
 * pipelines distintos (ej: "default" vs "corey"). Sin namespace,
 * dos análisis diferentes para los mismos filtros se pisarían.
 *
 * contextKey representa la versión del contexto editable (updated_at)
 * + el focusOverride inline. Si cualquiera de los dos cambia, el cache
 * se invalida automáticamente sin requerir un manual purge.
 */
export function hashFilters(
  filters: DashboardFilters,
  namespace = "default",
  contextKey?: string,
): string {
  // Solo incluimos `ns` y `ctx` si están seteados, así los caches
  // existentes (creados antes de existir estos parámetros) siguen
  // siendo válidos cuando el contextKey no se pasa.
  const base: Record<string, unknown> = {
    from: filters.from,
    to: filters.to,
    compare: filters.compare,
    publisher: filters.publisher ?? null,
    type: filters.type ?? null,
    campaignId: filters.campaignId ?? null,
  };
  if (namespace !== "default") base.ns = namespace;
  if (contextKey) base.ctx = contextKey;
  const canonical = JSON.stringify(base);

  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}
