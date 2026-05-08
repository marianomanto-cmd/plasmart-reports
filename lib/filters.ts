// Parseo de filtros desde la URL y serialización de vuelta.
// Valores inválidos se descartan silenciosamente para no romper el render.

import type {
  CompareMode,
  DashboardFilters,
  Publisher,
} from "@/lib/types";
import { defaultRange, isValidIsoDate } from "@/lib/dates";

const VALID_PUBLISHERS: ReadonlyArray<Publisher> = ["gads", "meta"];
const VALID_COMPARE: ReadonlyArray<CompareMode> = ["previous", "yoy", "none"];

type Raw = Record<string, string | string[] | undefined>;

function pickStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * searchParams → DashboardFilters.
 * Cualquier valor mal formado cae al default sin lanzar.
 */
export function parseFilters(searchParams: Raw): DashboardFilters {
  const def = defaultRange();

  const fromRaw = pickStr(searchParams.from);
  const toRaw = pickStr(searchParams.to);
  let from = isValidIsoDate(fromRaw) ? fromRaw : def.from;
  let to = isValidIsoDate(toRaw) ? toRaw : def.to;

  // Si quedó from > to por error, restauramos el default
  if (from > to) {
    from = def.from;
    to = def.to;
  }

  const compareRaw = pickStr(searchParams.compare);
  const compare: CompareMode = VALID_COMPARE.includes(compareRaw as CompareMode)
    ? (compareRaw as CompareMode)
    : "previous";

  const pubRaw = pickStr(searchParams.publisher);
  const publisher = VALID_PUBLISHERS.includes(pubRaw as Publisher)
    ? (pubRaw as Publisher)
    : undefined;

  const typeRaw = pickStr(searchParams.type);
  const type =
    typeRaw && typeRaw.length > 0 && typeRaw.length < 64 ? typeRaw : undefined;

  // Validación blanda de UUID (la BD valida en serio si pasa)
  const campaignRaw = pickStr(searchParams.campaign);
  const campaignId =
    campaignRaw && /^[0-9a-f-]{32,36}$/i.test(campaignRaw)
      ? campaignRaw
      : undefined;

  return { from, to, compare, publisher, type, campaignId };
}

/**
 * DashboardFilters → query string (sin "?").
 * Omite el modo "previous" porque es el default — mantiene la URL más corta.
 */
export function buildSearchString(filters: Partial<DashboardFilters>): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.compare && filters.compare !== "previous") {
    params.set("compare", filters.compare);
  }
  if (filters.publisher) params.set("publisher", filters.publisher);
  if (filters.type) params.set("type", filters.type);
  if (filters.campaignId) params.set("campaign", filters.campaignId);
  return params.toString();
}
