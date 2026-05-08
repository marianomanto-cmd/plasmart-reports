// Hash MD5 estable para usar como clave de cache en ai_analysis_cache.
// Web Crypto API no expone MD5 (por seguridad), pero MD5 está bien acá:
// no es un hash de seguridad, es solo una clave de cache. Usamos SHA-256
// truncado, que es nativo en Node y mucho más simple que traer una lib.

import { createHash } from "crypto";
import type { DashboardFilters } from "@/lib/types";

/**
 * Genera un hash determinístico de los filtros del dashboard.
 * Mismos filtros → mismo hash. Cambia cualquier filtro → hash distinto.
 */
export function hashFilters(filters: DashboardFilters): string {
  // Normalizamos los filtros a una representación canónica antes de hashear.
  // Esto garantiza que `{ from: "X", to: "Y" }` y `{ to: "Y", from: "X" }`
  // produzcan el mismo hash.
  const canonical = JSON.stringify({
    from: filters.from,
    to: filters.to,
    compare: filters.compare,
    publisher: filters.publisher ?? null,
    type: filters.type ?? null,
    campaignId: filters.campaignId ?? null,
  });

  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}
