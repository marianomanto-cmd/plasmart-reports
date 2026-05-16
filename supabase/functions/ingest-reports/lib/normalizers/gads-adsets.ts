// Normaliza filas crudas del export de Google Ads a nivel ad group a las
// shapes que entran a dim_adset y fact_adset_daily.
//
// Formato esperado del sheet (10 columnas, una fila por adset×día):
//
//   date | campaign_id | adset_id | adset_name | status | impressions
//   | clicks | cost | conversions | revenue
//
// El handler resuelve campaign_id (uuid) usando dim_campaign.external_id
// y adset_id (uuid) usando dim_adset.external_id dentro de la campaña.

import {
  AdsetFactWithExternal,
  CampaignStatus,
  DimAdsetRow,
} from "../../types.ts";

const EXPECTED_COLS = 10;

const STATUS_MAP: Record<string, CampaignStatus> = {
  ENABLED: "active",
  PAUSED: "paused",
  REMOVED: "ended",
};

function mapStatus(raw: string): CampaignStatus {
  return STATUS_MAP[raw?.toUpperCase()] ?? "paused";
}

function toFloat(value: string): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = parseFloat(String(value).replace(/,/g, "."));
  return Number.isFinite(n) ? n : 0;
}

function toInt(value: string): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = parseInt(String(value).replace(/[.,]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export interface NormalizedGadsAdsets {
  adsets: DimAdsetRow[];
  facts: AdsetFactWithExternal[];
}

export function normalizeGadsAdsetRows(rows: string[][]): NormalizedGadsAdsets {
  if (rows.length < 2) {
    return { adsets: [], facts: [] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Clave compuesta para deduplicar adsets dentro del sheet.
  const adsetsByKey = new Map<string, DimAdsetRow>();
  const facts: AdsetFactWithExternal[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    const padded = row.length < EXPECTED_COLS
      ? [...row, ...Array(EXPECTED_COLS - row.length).fill("")]
      : row;

    const [
      date,
      campaignExternalId,
      adsetExternalId,
      name,
      statusRaw,
      impressions,
      clicks,
      cost,
      conversions,
      revenue,
    ] = padded;

    if (!date || !campaignExternalId || !adsetExternalId) continue;

    const key = `${campaignExternalId}::${adsetExternalId}`;
    if (!adsetsByKey.has(key)) {
      adsetsByKey.set(key, {
        campaign_external_id: campaignExternalId,
        external_id: adsetExternalId,
        name: name || adsetExternalId,
        status: mapStatus(statusRaw),
        status_raw: statusRaw || null,
      });
    }

    const rawPayload: Record<string, unknown> = {};
    for (let i = 0; i < headers.length; i++) {
      rawPayload[headers[i]] = padded[i] ?? null;
    }

    facts.push({
      campaign_external_id: campaignExternalId,
      adset_external_id: adsetExternalId,
      date,
      impressions: toInt(impressions),
      clicks: toInt(clicks),
      conversions: Number(toFloat(conversions).toFixed(4)),
      cost_ars: Number(toFloat(cost).toFixed(2)),
      revenue_ars: Number(toFloat(revenue).toFixed(2)),
      raw_payload: rawPayload,
    });
  }

  return {
    adsets: Array.from(adsetsByKey.values()),
    facts,
  };
}
