// Normaliza filas crudas del export de Meta Ads a nivel ad set.
//
// Formato esperado del sheet (9 columnas, una fila por adset×día):
//
//   date | campaign_id | adset_id | adset_name | impressions
//   | clicks | spend | conversions | revenue
//
// Diferencias vs gads-adsets:
//   - 9 columnas en vez de 10 (Meta no manda status por fila — lo
//     defaultea a 'active' igual que el normalizer de campañas de Meta).
//   - El handler usa este normalizer con publisher='meta' al resolver
//     campaign_id contra dim_campaign.

import {
  AdsetFactWithExternal,
  DimAdsetRow,
} from "../../types.ts";

const EXPECTED_COLS = 9;

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

export interface NormalizedMetaAdsets {
  adsets: DimAdsetRow[];
  facts: AdsetFactWithExternal[];
}

export function normalizeMetaAdsetRows(
  rows: string[][],
): NormalizedMetaAdsets {
  if (rows.length < 2) {
    return { adsets: [], facts: [] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

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
      impressions,
      clicks,
      spend,
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
    adsets: Array.from(adsetsByKey.values()),
    facts,
  };
}
