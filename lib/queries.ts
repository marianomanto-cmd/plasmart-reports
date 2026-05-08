// Capa de queries del dashboard.
// Wrappea las RPCs de Postgres y normaliza tipos para los componentes.

import { createClient } from "@/lib/supabase/server";
import { comparisonRange } from "@/lib/dates";
import type {
  AvailableFilters,
  CampaignRow,
  DailyByPublisherPoint,
  DashboardFilters,
  DashboardKpis,
  Ga4Kpis,
  Ga4SourceMediumRow,
  Ga4Totals,
  KpiTotals,
  KpiWithDelta,
  Publisher,
} from "@/lib/types";

// ---------- Helpers internos ----------

function deltaPct(current: number, previous: number | null): number | null {
  if (previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function makeKpi(current: number, previous: number | null): KpiWithDelta {
  return {
    current,
    previous,
    deltaPct: deltaPct(current, previous),
  };
}

// ---------- Totales (KPI cards) ----------

async function fetchTotals(
  filters: Pick<DashboardFilters, "from" | "to" | "publisher" | "type" | "campaignId">,
): Promise<KpiTotals> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_kpi_totals", {
    p_from: filters.from,
    p_to: filters.to,
    p_publisher: filters.publisher ?? null,
    p_type: filters.type ?? null,
    p_campaign_id: filters.campaignId ?? null,
  });
  if (error) throw new Error(`dashboard_kpi_totals: ${error.message}`);

  const row = (data ?? [])[0] ?? {};
  return {
    cost: Number(row.cost ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    conversions: Number(row.conversions ?? 0),
  };
}

/**
 * Devuelve los 4 KPIs principales con su delta vs período de comparación.
 * Si compare === "none" no se hace la segunda query (ahorramos round-trip).
 */
export async function fetchKpis(
  filters: DashboardFilters,
): Promise<DashboardKpis> {
  const compareRange = comparisonRange(filters.from, filters.to, filters.compare);

  const currentPromise = fetchTotals(filters);
  const previousPromise: Promise<KpiTotals | null> = compareRange
    ? fetchTotals({ ...filters, from: compareRange.from, to: compareRange.to })
    : Promise.resolve(null);

  const [current, previous] = await Promise.all([
    currentPromise,
    previousPromise,
  ]);

  return {
    cost: makeKpi(current.cost, previous?.cost ?? null),
    impressions: makeKpi(current.impressions, previous?.impressions ?? null),
    clicks: makeKpi(current.clicks, previous?.clicks ?? null),
    conversions: makeKpi(current.conversions, previous?.conversions ?? null),
  };
}

// ---------- Opciones disponibles para los selects ----------

export async function fetchAvailableFilters(
  from: string,
  to: string,
  publisher?: Publisher,
): Promise<AvailableFilters> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_available_filters", {
    p_from: from,
    p_to: to,
    p_publisher: publisher ?? null,
  });
  if (error) throw new Error(`dashboard_available_filters: ${error.message}`);

  const row = (data ?? [])[0] ?? { types: [], campaigns: [] };
  return {
    types: (row.types ?? []) as string[],
    campaigns: (row.campaigns ?? []) as AvailableFilters["campaigns"],
  };
}

// ---------- Serie diaria por publisher (Fase 4.6) ----------

interface DailyRpcRow {
  date: string;
  publisher: string;
  cost: number | string;
}

export async function fetchDailyByPublisher(
  filters: DashboardFilters,
): Promise<DailyByPublisherPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_daily_by_publisher", {
    p_from: filters.from,
    p_to: filters.to,
    p_publisher: filters.publisher ?? null,
    p_type: filters.type ?? null,
    p_campaign_id: filters.campaignId ?? null,
  });
  if (error) throw new Error(`dashboard_daily_by_publisher: ${error.message}`);

  return (data ?? []).map((r: DailyRpcRow) => ({
    date: r.date,
    publisher: r.publisher as Publisher,
    cost: Number(r.cost ?? 0),
  }));
}

// ---------- Filas por campaña (top + tabla detalle) ----------

interface CampaignRpcRow {
  campaign_id: string;
  name: string;
  publisher: string;
  type: string;
  cost: number | string;
  impressions: number | string;
  clicks: number | string;
  conversions: number | string;
  ctr: number | string;
  cpc: number | string;
  cpa: number | string;
}

export async function fetchCampaignRows(
  filters: DashboardFilters,
  limit?: number,
): Promise<CampaignRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_campaign_rows", {
    p_from: filters.from,
    p_to: filters.to,
    p_publisher: filters.publisher ?? null,
    p_type: filters.type ?? null,
    p_campaign_id: filters.campaignId ?? null,
    p_limit: limit ?? null,
  });
  if (error) throw new Error(`dashboard_campaign_rows: ${error.message}`);

  return (data ?? []).map((r: CampaignRpcRow) => ({
    campaignId: r.campaign_id,
    name: r.name,
    publisher: r.publisher as Publisher,
    type: r.type,
    cost: Number(r.cost ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    conversions: Number(r.conversions ?? 0),
    ctr: Number(r.ctr ?? 0),
    cpc: Number(r.cpc ?? 0),
    cpa: Number(r.cpa ?? 0),
  }));
}

// ---- GA4 ----

interface Ga4TotalsRpcRow {
  sessions: number | string;
  users: number | string;
  new_users: number | string;
  key_events: number | string;
  bounce_rate: number | string;
  avg_session_duration: number | string;
}

async function fetchGa4Totals(
  from: string,
  to: string,
): Promise<Ga4Totals> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_ga4_totals", {
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(`dashboard_ga4_totals: ${error.message}`);

  const row = ((data ?? [])[0] ?? {}) as Partial<Ga4TotalsRpcRow>;
  return {
    sessions: Number(row.sessions ?? 0),
    users: Number(row.users ?? 0),
    newUsers: Number(row.new_users ?? 0),
    keyEvents: Number(row.key_events ?? 0),
    bounceRate: Number(row.bounce_rate ?? 0),
    avgSessionDuration: Number(row.avg_session_duration ?? 0),
  };
}

/**
 * KPIs de GA4 con delta vs período de comparación.
 * Solo usa from/to/compare de los filtros — el resto (publisher/type/
 * campaign) no aplica a GA4.
 */
export async function fetchGa4Kpis(
  filters: DashboardFilters,
): Promise<Ga4Kpis> {
  const compareRange = comparisonRange(filters.from, filters.to, filters.compare);

  const currentPromise = fetchGa4Totals(filters.from, filters.to);
  const previousPromise: Promise<Ga4Totals | null> = compareRange
    ? fetchGa4Totals(compareRange.from, compareRange.to)
    : Promise.resolve(null);

  const [current, previous] = await Promise.all([
    currentPromise,
    previousPromise,
  ]);

  return {
    sessions: makeKpi(current.sessions, previous?.sessions ?? null),
    users: makeKpi(current.users, previous?.users ?? null),
    keyEvents: makeKpi(current.keyEvents, previous?.keyEvents ?? null),
    bounceRate: makeKpi(current.bounceRate, previous?.bounceRate ?? null),
  };
}

interface Ga4SourceMediumRpcRow {
  source: string;
  medium: string;
  sessions: number | string;
  users: number | string;
  key_events: number | string;
  bounce_rate: number | string;
}

export async function fetchGa4SourceMedium(
  from: string,
  to: string,
  limit?: number,
): Promise<Ga4SourceMediumRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_ga4_source_medium", {
    p_from: from,
    p_to: to,
    p_limit: limit ?? null,
  });
  if (error) throw new Error(`dashboard_ga4_source_medium: ${error.message}`);

  return (data ?? []).map((r: Ga4SourceMediumRpcRow) => ({
    source: r.source,
    medium: r.medium,
    sessions: Number(r.sessions ?? 0),
    users: Number(r.users ?? 0),
    keyEvents: Number(r.key_events ?? 0),
    bounceRate: Number(r.bounce_rate ?? 0),
  }));
}
