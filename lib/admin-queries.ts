// Queries server-side para la página /admin.
// Se mantienen separadas de lib/queries.ts (que sirve al dashboard) porque
// son operacionales, no de reportería.

import { createClient } from "@/lib/supabase/server";

export interface IngestionLogRow {
  id: string;
  source: string;
  fileName: string | null;
  startedAt: string;
  finishedAt: string | null;
  rowsInserted: number | null;
  rowsUpdated: number | null;
  status: "success" | "partial" | "failed" | "running";
  errorMessage: string | null;
}

interface IngestionLogRpcRow {
  id: string;
  source: string;
  file_name: string | null;
  started_at: string;
  finished_at: string | null;
  rows_inserted: number | null;
  rows_updated: number | null;
  status: string;
  error_message: string | null;
}

/**
 * Devuelve las últimas N ejecuciones del ingest, ordenadas por started_at desc.
 * Por default trae 20 — la página /admin las muestra todas en una sola tabla.
 */
export async function fetchIngestionLog(limit = 20): Promise<IngestionLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingestion_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`fetchIngestionLog: ${error.message}`);

  return (data ?? []).map((r: IngestionLogRpcRow) => ({
    id: r.id,
    source: r.source,
    fileName: r.file_name,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    rowsInserted: r.rows_inserted,
    rowsUpdated: r.rows_updated,
    status: r.status as IngestionLogRow["status"],
    errorMessage: r.error_message,
  }));
}

// ---- Freshness por fuente ----

export type DataSource = "gads" | "meta" | "ga4";

export interface DataFreshnessRow {
  source: DataSource;
  maxDataDate: string | null;
  rowsTotal: number;
}

interface DataFreshnessRpcRow {
  source: string;
  max_data_date: string | null;
  rows_total: number | string;
}

/**
 * Última fecha con datos para cada fuente, y volumen total acumulado.
 * Útil para mostrar en /admin "los datos de GAds llegan hasta el 5 de mayo".
 */
export async function fetchDataFreshness(): Promise<DataFreshnessRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_data_freshness");
  if (error) throw new Error(`fetchDataFreshness: ${error.message}`);

  return (data ?? []).map((r: DataFreshnessRpcRow) => ({
    source: r.source as DataSource,
    maxDataDate: r.max_data_date,
    rowsTotal: Number(r.rows_total ?? 0),
  }));
}

// ---- Log de análisis generados por Claude ----

export interface AiAnalysisLogRow {
  id: string;
  generatedAt: string;
  userEmail: string;
  periodFrom: string;
  periodTo: string;
  compareMode: string;
  publisher: string | null;
  campaignType: string | null;
  campaignId: string | null;
  dataMaxDate: string | null;
  modelUsed: string;
  promptTokens: number | null;
  completionTokens: number | null;
  durationMs: number | null;
  content: string;
}

interface AiAnalysisLogRpcRow {
  id: string;
  generated_at: string;
  user_email: string;
  period_from: string;
  period_to: string;
  compare_mode: string;
  publisher: string | null;
  campaign_type: string | null;
  campaign_id: string | null;
  data_max_date: string | null;
  model_used: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  duration_ms: number | null;
  content: string;
}

/**
 * Devuelve los últimos N análisis generados, ordenados por generated_at desc.
 * Cada fila incluye el contenido completo (markdown) para mostrar en el modal
 * expandible — la tabla en sí no es enorme y para Plasmart con ~5 usuarios
 * el volumen es bajo.
 */
export async function fetchAiAnalysisLog(limit = 50): Promise<AiAnalysisLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_analysis_log")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`fetchAiAnalysisLog: ${error.message}`);

  return (data ?? []).map((r: AiAnalysisLogRpcRow) => ({
    id: r.id,
    generatedAt: r.generated_at,
    userEmail: r.user_email,
    periodFrom: r.period_from,
    periodTo: r.period_to,
    compareMode: r.compare_mode,
    publisher: r.publisher,
    campaignType: r.campaign_type,
    campaignId: r.campaign_id,
    dataMaxDate: r.data_max_date,
    modelUsed: r.model_used,
    promptTokens: r.prompt_tokens,
    completionTokens: r.completion_tokens,
    durationMs: r.duration_ms,
    content: r.content,
  }));
}
