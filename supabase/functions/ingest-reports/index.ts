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
import { normalizeGadsAdsetRows } from "./lib/normalizers/gads-adsets.ts";
import { normalizeGadsAdRows } from "./lib/normalizers/gads-ads.ts";
import { fetchGa4Data, getGa4AccessToken } from "./lib/ga4-client.ts";
import type {
  AdFactRow,
  AdFactWithExternal,
  AdsetFactRow,
  AdsetFactWithExternal,
  CampaignFactRow,
  DimAdRow,
  DimAdsetRow,
  DimCampaignRow,
  IngestResult,
  Source,
} from "./types.ts";

// Fuentes que se ingestan vía Drive (sheets que dropea el equipo). GA4 NO va
// acá: se trae directo de la Data API en un bloque aparte.
//
// `gads` y `meta` apuntan a folders con sheets a nivel campaña.
// `gads_adsets` y `gads_ads` son opcionales: si las env vars
// DRIVE_FOLDER_GADS_ADSETS / DRIVE_FOLDER_GADS_ADS no están seteadas,
// esos source se saltean en silencio. Útil para activar la granularidad
// progresivamente sin romper la ingesta core.
type DriveSource = "gads" | "meta" | "gads_adsets" | "gads_ads";

const REQUIRED_SOURCES: Record<"gads" | "meta", string> = {
  gads: "1q0iduDYtjptDi5MQwwYgbFcv-rcZl-kW",
  meta: "1GIrJ6FNZ4RednoeGZQtHGgS1CFYw8Vbs",
};

function getOptionalFolderId(envKey: string): string | null {
  const v = Deno.env.get(envKey)?.trim();
  return v && v.length > 0 ? v : null;
}

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

// Ingesta de adsets (solo Google Ads, por ahora). Resuelve campaign_id
// usando dim_campaign.external_id para cada adset y luego dim_adset.id
// para cada fact.
async function ingestGadsAdsets(
  supabase: ReturnType<typeof getSupabaseClient>,
  adsets: DimAdsetRow[],
  factsWithExternal: AdsetFactWithExternal[],
): Promise<number> {
  if (adsets.length === 0) {
    console.log(`[gads_adsets] no hay adsets para upsertear`);
    return 0;
  }

  // 1) Resolver campaign_id (uuid) por external_id.
  const campaignExternals = Array.from(
    new Set(adsets.map((a) => a.campaign_external_id)),
  );
  const { data: campaignRows, error: campSelErr } = await supabase
    .from("dim_campaign")
    .select("id, external_id")
    .eq("publisher", "gads")
    .in("external_id", campaignExternals);
  if (campSelErr) {
    throw new Error(`Select dim_campaign falló: ${campSelErr.message}`);
  }
  const campaignIdByExternal = new Map<string, string>();
  for (const c of campaignRows ?? []) {
    campaignIdByExternal.set(String(c.external_id), String(c.id));
  }

  // 2) Filtrar adsets cuya campaign existe en dim_campaign.
  const adsetsToUpsert = adsets
    .map((a) => {
      const campaignId = campaignIdByExternal.get(a.campaign_external_id);
      if (!campaignId) return null;
      return {
        campaign_id: campaignId,
        external_id: a.external_id,
        name: a.name,
        status: a.status,
        status_raw: a.status_raw,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (adsetsToUpsert.length === 0) {
    console.log(
      `[gads_adsets] ningún adset tiene una campaign correspondiente en dim_campaign`,
    );
    return 0;
  }

  console.log(`[gads_adsets] upserting ${adsetsToUpsert.length} adsets en dim_adset`);
  const { data: upsertedAdsets, error: adsetErr } = await supabase
    .from("dim_adset")
    .upsert(adsetsToUpsert, { onConflict: "campaign_id,external_id" })
    .select("id, campaign_id, external_id");
  if (adsetErr) {
    throw new Error(`Upsert dim_adset falló: ${adsetErr.message}`);
  }

  // 3) Resolver (campaign_id, external_id) → adset.id
  const adsetIdByKey = new Map<string, string>();
  for (const a of upsertedAdsets ?? []) {
    adsetIdByKey.set(`${a.campaign_id}::${a.external_id}`, String(a.id));
  }

  // 4) Construir facts con adset_id resuelto.
  const facts: AdsetFactRow[] = [];
  for (const f of factsWithExternal) {
    const campaignId = campaignIdByExternal.get(f.campaign_external_id);
    if (!campaignId) continue;
    const adsetId = adsetIdByKey.get(`${campaignId}::${f.adset_external_id}`);
    if (!adsetId) {
      console.warn(
        `[gads_adsets] sin uuid para adset ${f.adset_external_id} en campaign ${f.campaign_external_id}`,
      );
      continue;
    }
    facts.push({
      date: f.date,
      adset_id: adsetId,
      impressions: f.impressions,
      clicks: f.clicks,
      conversions: f.conversions,
      cost_ars: f.cost_ars,
      revenue_ars: f.revenue_ars,
      raw_payload: f.raw_payload,
    });
  }

  if (facts.length === 0) {
    console.log(`[gads_adsets] no hay facts para insertar`);
    return 0;
  }

  console.log(`[gads_adsets] upserting ${facts.length} facts en fact_adset_daily`);
  const { error: factErr } = await supabase
    .from("fact_adset_daily")
    .upsert(facts, { onConflict: "date,adset_id" });
  if (factErr) {
    throw new Error(`Upsert fact_adset_daily falló: ${factErr.message}`);
  }

  return facts.length;
}

// Ingesta de ads. Resuelve campaign_id, adset_id y luego ad_id.
async function ingestGadsAds(
  supabase: ReturnType<typeof getSupabaseClient>,
  ads: DimAdRow[],
  factsWithExternal: AdFactWithExternal[],
): Promise<number> {
  if (ads.length === 0) {
    console.log(`[gads_ads] no hay ads para upsertear`);
    return 0;
  }

  // 1) Resolver campaign_id por external_id
  const campaignExternals = Array.from(
    new Set(ads.map((a) => a.campaign_external_id)),
  );
  const { data: campaignRows, error: campSelErr } = await supabase
    .from("dim_campaign")
    .select("id, external_id")
    .eq("publisher", "gads")
    .in("external_id", campaignExternals);
  if (campSelErr) {
    throw new Error(`Select dim_campaign falló: ${campSelErr.message}`);
  }
  const campaignIdByExternal = new Map<string, string>();
  for (const c of campaignRows ?? []) {
    campaignIdByExternal.set(String(c.external_id), String(c.id));
  }

  // 2) Resolver adset_id por (campaign_id, adset_external_id).
  const campaignIds = Array.from(new Set(campaignIdByExternal.values()));
  const { data: adsetRows, error: adsetSelErr } = await supabase
    .from("dim_adset")
    .select("id, campaign_id, external_id")
    .in("campaign_id", campaignIds);
  if (adsetSelErr) {
    throw new Error(`Select dim_adset falló: ${adsetSelErr.message}`);
  }
  const adsetIdByKey = new Map<string, string>();
  for (const a of adsetRows ?? []) {
    adsetIdByKey.set(
      `${a.campaign_id}::${a.external_id}`,
      String(a.id),
    );
  }

  // 3) Filtrar ads cuyo adset existe.
  const adsToUpsert = ads
    .map((a) => {
      const campaignId = campaignIdByExternal.get(a.campaign_external_id);
      if (!campaignId) return null;
      const adsetId = adsetIdByKey.get(
        `${campaignId}::${a.adset_external_id}`,
      );
      if (!adsetId) return null;
      return {
        adset_id: adsetId,
        external_id: a.external_id,
        name: a.name,
        status: a.status,
        status_raw: a.status_raw,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (adsToUpsert.length === 0) {
    console.log(
      `[gads_ads] ningún ad tiene adset correspondiente en dim_adset`,
    );
    return 0;
  }

  console.log(`[gads_ads] upserting ${adsToUpsert.length} ads en dim_ad`);
  const { data: upsertedAds, error: adErr } = await supabase
    .from("dim_ad")
    .upsert(adsToUpsert, { onConflict: "adset_id,external_id" })
    .select("id, adset_id, external_id");
  if (adErr) {
    throw new Error(`Upsert dim_ad falló: ${adErr.message}`);
  }

  // 4) Resolver (adset_id, external_id) → ad.id
  const adIdByKey = new Map<string, string>();
  for (const a of upsertedAds ?? []) {
    adIdByKey.set(`${a.adset_id}::${a.external_id}`, String(a.id));
  }

  // 5) Construir facts con ad_id resuelto.
  const facts: AdFactRow[] = [];
  for (const f of factsWithExternal) {
    const campaignId = campaignIdByExternal.get(f.campaign_external_id);
    if (!campaignId) continue;
    const adsetId = adsetIdByKey.get(
      `${campaignId}::${f.adset_external_id}`,
    );
    if (!adsetId) continue;
    const adId = adIdByKey.get(`${adsetId}::${f.ad_external_id}`);
    if (!adId) {
      console.warn(`[gads_ads] sin uuid para ad ${f.ad_external_id}`);
      continue;
    }
    facts.push({
      date: f.date,
      ad_id: adId,
      impressions: f.impressions,
      clicks: f.clicks,
      conversions: f.conversions,
      cost_ars: f.cost_ars,
      revenue_ars: f.revenue_ars,
      raw_payload: f.raw_payload,
    });
  }

  if (facts.length === 0) {
    console.log(`[gads_ads] no hay facts para insertar`);
    return 0;
  }

  console.log(`[gads_ads] upserting ${facts.length} facts en fact_ad_daily`);
  const { error: factErr } = await supabase
    .from("fact_ad_daily")
    .upsert(facts, { onConflict: "date,ad_id" });
  if (factErr) {
    throw new Error(`Upsert fact_ad_daily falló: ${factErr.message}`);
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

  // Resolución del set efectivo de Drive sources: las 2 fijas (campañas
  // de GAds y Meta) + las opcionales que tengan env var seteada.
  const driveSources: Array<{ key: DriveSource; folderId: string }> = [
    { key: "gads", folderId: REQUIRED_SOURCES.gads },
    { key: "meta", folderId: REQUIRED_SOURCES.meta },
  ];
  const gadsAdsetsFolder = getOptionalFolderId("DRIVE_FOLDER_GADS_ADSETS");
  if (gadsAdsetsFolder) {
    driveSources.push({ key: "gads_adsets", folderId: gadsAdsetsFolder });
  } else {
    console.log("[gads_adsets] DRIVE_FOLDER_GADS_ADSETS no seteada — salteando");
  }
  const gadsAdsFolder = getOptionalFolderId("DRIVE_FOLDER_GADS_ADS");
  if (gadsAdsFolder) {
    driveSources.push({ key: "gads_ads", folderId: gadsAdsFolder });
  } else {
    console.log("[gads_ads] DRIVE_FOLDER_GADS_ADS no seteada — salteando");
  }

  for (const { key: sourceKey, folderId } of driveSources) {
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
      } else if (sourceKey === "meta") {
        const { campaigns, facts } = normalizeMetaRows(rows);
        rowsInserted = await ingestCampaignSource(
          supabase,
          "meta",
          campaigns,
          facts,
        );
      } else if (sourceKey === "gads_adsets") {
        const { adsets, facts } = normalizeGadsAdsetRows(rows);
        rowsInserted = await ingestGadsAdsets(supabase, adsets, facts);
      } else if (sourceKey === "gads_ads") {
        const { ads, facts } = normalizeGadsAdRows(rows);
        rowsInserted = await ingestGadsAds(supabase, ads, facts);
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
