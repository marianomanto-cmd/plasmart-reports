// Normaliza filas crudas del export de Meta Ads Manager. Mismo enfoque que el
// normalizer de gads: devolvemos campaigns deduplicadas y facts con external_id
// para que el handler resuelva el uuid después del upsert.

import {
  CampaignFactRow,
  CampaignType,
  DimCampaignRow,
} from "../../types.ts";

// El export de Meta trae 9 columnas (no manda estado por fila).
const EXPECTED_COLS = 9;

const OBJECTIVE_MAP: Record<string, CampaignType> = {
  OUTCOME_AWARENESS: "awareness",
  OUTCOME_TRAFFIC: "traffic",
  OUTCOME_ENGAGEMENT: "engagement",
  OUTCOME_LEADS: "leads",
  OUTCOME_SALES: "sales",
  OUTCOME_APP_PROMOTION: "app",
};

function mapObjective(raw: string): CampaignType {
  return OBJECTIVE_MAP[raw?.toUpperCase()] ?? "other";
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

export type MetaFactWithExternal = Omit<CampaignFactRow, "campaign_id"> & {
  external_id: string;
};

export interface NormalizedMeta {
  campaigns: DimCampaignRow[];
  facts: MetaFactWithExternal[];
}

export function normalizeMetaRows(rows: string[][]): NormalizedMeta {
  if (rows.length < 2) {
    return { campaigns: [], facts: [] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const campaignsByExternal = new Map<string, DimCampaignRow>();
  const facts: MetaFactWithExternal[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    const padded = row.length < EXPECTED_COLS
      ? [...row, ...Array(EXPECTED_COLS - row.length).fill("")]
      : row;

    const [
      date,
      externalId,
      name,
      objective,
      impressions,
      clicks,
      spend,
      conversions,
      revenue,
    ] = padded;

    if (!date || !externalId) continue;

    if (!campaignsByExternal.has(externalId)) {
      campaignsByExternal.set(externalId, {
        publisher: "meta",
        external_id: externalId,
        name: name || externalId,
        type: mapObjective(objective),
        type_raw: objective || null,
        // Meta no manda estado por fila: las pausadas no traen datos, así que
        // todas las que aparecen las marcamos como activas.
        status: "active",
        status_raw: null,
      });
    }

    const rawPayload: Record<string, unknown> = {};
    for (let i = 0; i < headers.length; i++) {
      rawPayload[headers[i]] = padded[i] ?? null;
    }

    facts.push({
      external_id: externalId,
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
    campaigns: Array.from(campaignsByExternal.values()),
    facts,
  };
}
