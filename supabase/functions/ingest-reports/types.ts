// Tipos compartidos entre el handler y los normalizers de la Edge Function
// ingest-reports. El código va en inglés; los comentarios, en castellano.

export type Source = "gads" | "meta" | "ga4";

// Resumen de lo que pasó al ingerir una fuente. Lo devolvemos en el body.
export interface IngestResult {
  source: Source;
  file_name: string | null;
  rows_inserted: number;
  status: "success" | "partial" | "failed" | "running";
  error_message?: string;
}

// Enums espejo de los definidos en la migration inicial.
export type CampaignType =
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

export type CampaignStatus = "active" | "paused" | "ended";

export type CampaignPublisher = "gads" | "meta";

// Fila de dim_campaign sin id (la genera la DB con gen_random_uuid).
export interface DimCampaignRow {
  publisher: CampaignPublisher;
  external_id: string;
  name: string;
  type: CampaignType;
  type_raw: string | null;
  status: CampaignStatus;
  status_raw: string | null;
}

// Fila de fact_campaign_daily, sin los campos generados (ctr/cpc/cpa/roas).
export interface CampaignFactRow {
  date: string; // YYYY-MM-DD
  campaign_id: string; // uuid resuelto desde dim_campaign
  impressions: number;
  clicks: number;
  conversions: number;
  cost_ars: number;
  revenue_ars: number;
  raw_payload: Record<string, unknown>;
}

// Fila de fact_ga_daily.
export interface GaFactRow {
  date: string;
  source: string;
  medium: string;
  sessions: number;
  total_users: number;
  new_users: number;
  page_views: number;
  key_events: number;
  avg_session_duration: number;
  bounce_rate: number;
  raw_payload: Record<string, unknown>;
}
