// Normaliza filas crudas del export de Google Ads a nivel ad individual.
//
// Formato esperado del sheet (11 columnas, una fila por ad×día):
//
//   date | campaign_id | adset_id | ad_id | ad_name | status
//   | impressions | clicks | cost | conversions | revenue

import {
  AdFactWithExternal,
  CampaignStatus,
  DimAdRow,
} from "../../types.ts";

const EXPECTED_COLS = 11;

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

export interface NormalizedGadsAds {
  ads: DimAdRow[];
  facts: AdFactWithExternal[];
}

export function normalizeGadsAdRows(rows: string[][]): NormalizedGadsAds {
  if (rows.length < 2) {
    return { ads: [], facts: [] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const adsByKey = new Map<string, DimAdRow>();
  const facts: AdFactWithExternal[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    const padded = row.length < EXPECTED_COLS
      ? [...row, ...Array(EXPECTED_COLS - row.length).fill("")]
      : row;

    const [
      date,
      campaignExternalId,
      adsetExternalId,
      adExternalId,
      name,
      statusRaw,
      impressions,
      clicks,
      cost,
      conversions,
      revenue,
    ] = padded;

    if (!date || !campaignExternalId || !adsetExternalId || !adExternalId) {
      continue;
    }

    const key = `${campaignExternalId}::${adsetExternalId}::${adExternalId}`;
    if (!adsByKey.has(key)) {
      adsByKey.set(key, {
        campaign_external_id: campaignExternalId,
        adset_external_id: adsetExternalId,
        external_id: adExternalId,
        name: name || adExternalId,
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
      ad_external_id: adExternalId,
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
    ads: Array.from(adsByKey.values()),
    facts,
  };
}
