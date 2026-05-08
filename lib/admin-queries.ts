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
