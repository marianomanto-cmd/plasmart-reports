// Normaliza filas crudas del export de Meta Ads a nivel ad individual.
//
// Formato esperado del sheet (10 columnas, una fila por ad×día):
//
//   date | campaign_id | adset_id | ad_id | ad_name | impressions
//   | clicks | spend | conversions | revenue

import {
  AdFactWithExternal,
  DimAdRow,
} from "../../types.ts";

const EXPECTED_COLS = 10;

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

export interface NormalizedMetaAds {
  ads: DimAdRow[];
  facts: AdFactWithExternal[];
}

export function normalizeMetaAdRows(rows: string[][]): NormalizedMetaAds {
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
      impressions,
      clicks,
      spend,
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
        status: "active",
        status_raw: null,
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
      cost_ars: Number(toFloat(spend).toFixed(2)),
      revenue_ars: Number(toFloat(revenue).toFixed(2)),
      raw_payload: rawPayload,
    });
  }

  return {
    ads: Array.from(adsByKey.values()),
    facts,
  };
}
