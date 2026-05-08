// Edge Function: ingest-reports
// ------------------------------------------------------------
// Para cada fuente (Google Ads, Meta Ads, Google Analytics 4):
//   1. Toma el sheet más reciente de la carpeta de Drive correspondiente.
//   2. Normaliza las filas a la shape de las tablas fact_* y dim_campaign.
//   3. Upsertea contra Supabase con la Service Role Key.
//   4. Loguea cada corrida en ingestion_log (running → success/failed).
// Al final refresca las vistas materializadas. Una fuente que falla NO rompe
// las demás: el error queda guardado en su ingestion_log y seguimos.

import { getAccessToken } from "./lib/google-auth.ts";
import { listFilesInFolder, readSheet } from "./lib/drive-client.ts";
import { getSupabaseClient } from "./lib/supabase-client.ts";
import { normalizeGadsRows } from "./lib/normalizers/gads.ts";
import { normalizeMetaRows } from "./lib/normalizers/meta.ts";
import { fetchGa4Data, getGa4AccessToken } from "./lib/ga4-client.ts";
import type {
  CampaignFactRow,
  DimCampaignRow,
  IngestResult,
  Source,
} from "./types.ts";

// Fuentes que se ingestan vía Drive (sheets que dropea el equipo). GA4 NO va
// acá: se trae directo de la Data API en un bloque aparte.
type DriveSource = Exclude<Source, "ga4">;
const SOURCES: Record<DriveSource, string> = {
  gads: "1q0iduDYtjptDi5MQwwYgbFcv-rcZl-kW",
  meta: "1GIrJ6FNZ4RednoeGZQtHGgS1CFYw8Vbs",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Ingesta de Google Ads o Meta: ambas comparten dim_campaign + fact_campaign_daily.
async function ingestCampaignSource(
  supabase: ReturnType<typeof getSupabaseClient>,
  source: "gads" | "meta",
  campaigns: DimCampaignRow[],
  factsWithExternal: Array<Omit<CampaignFactRow, "campaign_id"> & { external_id: string }>,
): Promise<number> {
  if (campaigns.length === 0) {
    console.log(`[${source}] no hay campaigns para upsertear`);
    return 0;
  }

  console.log(`[${source}] upserting ${campaigns.length} campañas en dim_campaign`);
  const { data: upsertedCampaigns, error: campErr } = await supabase
    .from("dim_campaign")
    .upsert(campaigns, { onConflict: "publisher,external_id" })
    .select("id, external_id");

  if (campErr) {
    throw new Error(`Upsert dim_campaign falló: ${campErr.message}`);
  }

  // external_id → uuid para resolver los facts.
  const idByExternal = new Map<string, string>();
  for (const c of upsertedCampaigns ?? []) {
    idByExternal.set(String(c.external_id), String(c.id));
  }

  // Si por algún motivo el upsert no retornó alguna fila (ej. conflicto sin
  // returning), la traemos con un select explícito para no perder facts.
  const missing = campaigns
    .map((c) => c.external_id)
    .filter((ext) => !idByExternal.has(ext));
  if (missing.length > 0) {
    const { data: fallback, error: selErr } = await supabase
      .from("dim_campaign")
      .select("id, external_id")
      .eq("publisher", source)
      .in("external_id", missing);
    if (selErr) {
      throw new Error(`Fallback select dim_campaign falló: ${selErr.message}`);
    }
    for (const c of fallback ?? []) {
      idByExternal.set(String(c.external_id), String(c.id));
    }
  }

  const facts: CampaignFactRow[] = [];
  for (const f of factsWithExternal) {
    const campaignId = idByExternal.get(f.external_id);
    if (!campaignId) {
      console.warn(
        `[${source}] sin uuid para external_id=${f.external_id}, salteando fact ${f.date}`,
      );
      continue;
    }
    facts.push({
      date: f.date,
      campaign_id: campaignId,
      impressions: f.impressions,
      clicks: f.clicks,
      conversions: f.conversions,
      cost_ars: f.cost_ars,
      revenue_ars: f.revenue_ars,
      raw_payload: f.raw_payload,
    });
  }

  if (facts.length === 0) {
    console.log(`[${source}] no hay facts para insertar`);
    return 0;
  }

  console.log(`[${source}] upserting ${facts.length} facts en fact_campaign_daily`);
  const { error: factErr } = await supabase
    .from("fact_campaign_daily")
    .upsert(facts, { onConflict: "date,campaign_id" });

  if (factErr) {
    throw new Error(`Upsert fact_campaign_daily falló: ${factErr.message}`);
  }

  return facts.length;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método no permitido" }, 405);
  }

  const startedAt = new Date();
  console.log(`[ingest-reports] arrancando run @ ${startedAt.toISOString()}`);

  let accessToken: string;
  let supabase: ReturnType<typeof getSupabaseClient>;
  try {
    accessToken = await getAccessToken();
    supabase = getSupabaseClient();
  } catch (err) {
    const message = (err as Error).message;
    console.error("[ingest-reports] init falló:", message);
    return jsonResponse({ ok: false, error: message }, 500);
  }

  const results: IngestResult[] = [];

  for (const sourceKey of Object.keys(SOURCES) as DriveSource[]) {
    const folderId = SOURCES[sourceKey];
    console.log(`\n[${sourceKey}] === inicio fuente ===`);

    // Log inicial: status='running'. Lo updateamos al final con success/failed.
    let logId: string | null = null;
    let fileName: string | null = null;
    try {
      const { data: logRow, error: logErr } = await supabase
        .from("ingestion_log")
        .insert({
          source: sourceKey,
          started_at: new Date().toISOString(),
          status: "running",
        })
        .select("id")
        .single();
      if (logErr) {
        console.error(`[${sourceKey}] no pude crear ingestion_log:`, logErr.message);
      } else {
        logId = String(logRow.id);
      }
    } catch (err) {
      console.error(`[${sourceKey}] error creando log inicial:`, (err as Error).message);
    }

    try {
      const files = await listFilesInFolder(accessToken, folderId);
      if (files.length === 0) {
        throw new Error(`La carpeta ${folderId} no tiene Google Sheets`);
      }
      const latest = files[0]; // ya viene ordenado desc por modifiedTime
      fileName = latest.name;
      console.log(
        `[${sourceKey}] archivo más reciente: ${latest.name} (mod ${latest.modifiedTime})`,
      );

      const rows = await readSheet(accessToken, latest.id);
      console.log(`[${sourceKey}] leídas ${rows.length} filas crudas`);

      let rowsInserted = 0;

      if (sourceKey === "gads") {
        const { campaigns, facts } = normalizeGadsRows(rows);
        rowsInserted = await ingestCampaignSource(
          supabase,
          "gads",
          campaigns,
          facts,
        );
      } else {
        const { campaigns, facts } = normalizeMetaRows(rows);
        rowsInserted = await ingestCampaignSource(
          supabase,
          "meta",
          campaigns,
          facts,
        );
      }

      results.push({
        source: sourceKey,
        file_name: fileName,
        rows_inserted: rowsInserted,
        status: "success",
      });

      if (logId) {
        await supabase
          .from("ingestion_log")
          .update({
            file_name: fileName,
            finished_at: new Date().toISOString(),
            rows_inserted: rowsInserted,
            status: "success",
          })
          .eq("id", logId);
      }
      console.log(`[${sourceKey}] OK — ${rowsInserted} filas`);
    } catch (err) {
      const message = (err as Error).message;
      console.error(`[${sourceKey}] FALLÓ:`, message);
      results.push({
        source: sourceKey,
        file_name: fileName,
        rows_inserted: 0,
        status: "failed",
        error_message: message,
      });

      if (logId) {
        await supabase
          .from("ingestion_log")
          .update({
            file_name: fileName,
            finished_at: new Date().toISOString(),
            status: "failed",
            error_message: message,
          })
          .eq("id", logId);
      }
      // No abortamos: seguimos con la próxima fuente.
    }
  }

  // ----------------------------------------------------------------
  // GA4 — bloque aparte: usa OAuth Refresh Token + GA4 Data API,
  // no Drive. Trae los últimos 7 días completos (sin contar hoy).
  // ----------------------------------------------------------------
  console.log(`\n[ga4] === inicio fuente ===`);
  let ga4LogId: string | null = null;
  try {
    const { data: logRow, error: logErr } = await supabase
      .from("ingestion_log")
      .insert({
        source: "ga4",
        started_at: new Date().toISOString(),
        status: "running",
      })
      .select("id")
      .single();
    if (logErr) {
      console.error("[ga4] no pude crear ingestion_log:", logErr.message);
    } else {
      ga4LogId = String(logRow.id);
    }
  } catch (err) {
    console.error("[ga4] error creando log inicial:", (err as Error).message);
  }

  try {
    const propertyId = Deno.env.get("GA4_PROPERTY_ID");
    if (!propertyId) {
      throw new Error("Falta la env var GA4_PROPERTY_ID");
    }

    // Ventana: últimos 7 días completos. endDate = ayer, startDate = hace 7 días.
    const todayMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const endDate = new Date(todayMs - dayMs).toISOString().slice(0, 10);
    const startDate = new Date(todayMs - 7 * dayMs).toISOString().slice(0, 10);
    console.log(`[ga4] ventana ${startDate} → ${endDate}`);

    const ga4Token = await getGa4AccessToken();
    const gaRows = await fetchGa4Data(ga4Token, propertyId, startDate, endDate);
    console.log(`[ga4] runReport devolvió ${gaRows.length} filas`);

    let rowsInserted = 0;
    if (gaRows.length > 0) {
      const { error: gaErr } = await supabase
        .from("fact_ga_daily")
        .upsert(gaRows, { onConflict: "date,source,medium" });
      if (gaErr) {
        throw new Error(`Upsert fact_ga_daily falló: ${gaErr.message}`);
      }
      rowsInserted = gaRows.length;
    }

    results.push({
      source: "ga4",
      file_name: null,
      rows_inserted: rowsInserted,
      status: "success",
    });

    if (ga4LogId) {
      await supabase
        .from("ingestion_log")
        .update({
          file_name: `GA4 Data API ${startDate}→${endDate}`,
          finished_at: new Date().toISOString(),
          rows_inserted: rowsInserted,
          status: "success",
        })
        .eq("id", ga4LogId);
    }
    console.log(`[ga4] OK — ${rowsInserted} filas`);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[ga4] FALLÓ:", message);
    results.push({
      source: "ga4",
      file_name: null,
      rows_inserted: 0,
      status: "failed",
      error_message: message,
    });

    if (ga4LogId) {
      await supabase
        .from("ingestion_log")
        .update({
          finished_at: new Date().toISOString(),
          status: "failed",
          error_message: message,
        })
        .eq("id", ga4LogId);
    }
  }

  // Refresco de vistas materializadas, solo si hubo al menos un success.
  const anySuccess = results.some((r) => r.status === "success");
  if (anySuccess) {
    console.log("[ingest-reports] refrescando vistas materializadas");
    const { error: rpcErr } = await supabase.rpc(
      "refresh_all_materialized_views",
    );
    if (rpcErr) {
      console.error("[ingest-reports] refresh_all_materialized_views falló:", rpcErr.message);
    } else {
      console.log("[ingest-reports] vistas materializadas refrescadas");
    }
  } else {
    console.log("[ingest-reports] no hubo successes, salteo refresh de vistas");
  }

  const finishedAt = new Date();
  console.log(
    `[ingest-reports] fin run @ ${finishedAt.toISOString()} — ${results.length} fuentes`,
  );

  return jsonResponse({
    ok: true,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    results,
  });
});
