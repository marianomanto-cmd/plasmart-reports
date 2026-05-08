// Tipos del dominio del dashboard.
// Espejo de las RPCs definidas en supabase/migrations/20260508120000_phase4_dashboard.sql
// y del enum campaign_type de la migración inicial.

export type Publisher = "gads" | "meta";

// Los 15 valores del enum campaign_type en Postgres.
// Lo dejo abierto a string para no romper el render si el enum crece
// y todavía no actualizamos este archivo.
export type CampaignTypeKnown =
  | "search"
  | "display"
  | "video"
  | "pmax"
  | "demand_gen"
  | "shopping"
  | "app"
  | "social"
  | "reach"
  | "awareness"
  | "engagement"
  | "sales"
  | "leads"
  | "traffic"
  | "other";

export type CampaignType = CampaignTypeKnown | (string & {});

// Modo de comparación para los deltas de los KPIs.
//   previous → mismo largo inmediatamente anterior (default)
//   yoy      → mismo rango exacto del año pasado
//   none     → sin comparación, los KPIs solo muestran el valor
export type CompareMode = "previous" | "yoy" | "none";

export interface DashboardFilters {
  from: string;          // YYYY-MM-DD inclusive
  to: string;            // YYYY-MM-DD inclusive
  compare: CompareMode;
  publisher?: Publisher;
  type?: CampaignType;
  campaignId?: string;
}

// ---- KPI cards ----

export interface KpiTotals {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface KpiWithDelta {
  current: number;
  // null si compare === "none" o si el período de comparación dio cero
  // (en cuyo caso no se puede calcular un delta válido).
  previous: number | null;
  deltaPct: number | null;
}

export interface DashboardKpis {
  cost: KpiWithDelta;
  impressions: KpiWithDelta;
  clicks: KpiWithDelta;
  conversions: KpiWithDelta;
}

// ---- Serie diaria por publisher (Fase 4.6: gráfico de línea) ----

export interface DailyByPublisherPoint {
  date: string;
  publisher: Publisher;
  cost: number;
}

// ---- Filas por campaña (top + tabla detalle) ----

export interface CampaignRow {
  campaignId: string;
  name: string;
  publisher: Publisher;
  type: CampaignType;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;        // 0..1
  cpc: number;        // ARS por click
  cpa: number;        // ARS por conversión
}

// ---- Opciones disponibles para los selects ----

export interface AvailableFilters {
  types: string[];
  campaigns: Array<{
    id: string;
    name: string;
    publisher: Publisher;
    type: CampaignType;
  }>;
}

// ---- GA4 (Fase 4.8) ----

export interface Ga4Totals {
  sessions: number;
  users: number;
  newUsers: number;
  keyEvents: number;
  bounceRate: number;          // 0..1
  avgSessionDuration: number;  // segundos
}

export interface Ga4WithDelta {
  current: number;
  previous: number | null;
  deltaPct: number | null;
}

export interface Ga4Kpis {
  sessions: Ga4WithDelta;
  users: Ga4WithDelta;
  keyEvents: Ga4WithDelta;
  bounceRate: Ga4WithDelta;
}

export interface Ga4SourceMediumRow {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  keyEvents: number;
  bounceRate: number; // 0..1
}
