// Normaliza filas crudas del export de Google Ads a las shapes que entran a
// dim_campaign y fact_campaign_daily. Devolvemos los facts con external_id
// (no campaign_id): el handler resuelve el uuid después del upsert de campaigns.

import {
  CampaignFactRow,
  CampaignStatus,
  CampaignType,
  DimCampaignRow,
} from "../../types.ts";

// El export del addon "Google Ads → Sheets" trae 10 columnas en este orden.
const EXPECTED_COLS = 10;

const TYPE_MAP: Record<string, CampaignType> = {
  SEARCH: "search",
  DISPLAY: "display",
  VIDEO: "video",
  PERFORMANCE_MAX: "pmax",
  DEMAND_GEN: "demand_gen",
  SHOPPING: "shopping",
  MULTI_CHANNEL: "other",
};

const STATUS_MAP: Record<string, CampaignStatus> = {
  ENABLED: "active",
  PAUSED: "paused",
  REMOVED: "ended",
};

function mapType(raw: string): CampaignType {
  return TYPE_MAP[raw?.toUpperCase()] ?? "other";
}

function mapStatus(raw: string): CampaignStatus {
  return STATUS_MAP[raw?.toUpperCase()] ?? "paused";
}

// parseFloat tolerante: si viene vacío o no parsea, retorna 0.
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

// Para el fact externamos external_id como string para resolverlo a uuid en el
// handler una vez que dim_campaign está actualizado.
export type GadsFactWithExternal = Omit<CampaignFactRow, "campaign_id"> & {
  external_id: string;
};

export interface NormalizedGads {
  campaigns: DimCampaignRow[];
  facts: GadsFactWithExternal[];
}

export function normalizeGadsRows(rows: string[][]): NormalizedGads {
  if (rows.length < 2) {
    return { campaigns: [], facts: [] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const campaignsByExternal = new Map<string, DimCampaignRow>();
  const facts: GadsFactWithExternal[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    // Si la fila viene corta, paddeamos para no romper el destructuring.
    const padded = row.length < EXPECTED_COLS
      ? [...row, ...Array(EXPECTED_COLS - row.length).fill("")]
      : row;

    const [
      date,
      externalId,
      name,
      typeRaw,
      statusRaw,
      impressions,
      clicks,
      cost,
      conversions,
      revenue,
    ] = padded;

    if (!date || !externalId) continue;

    // Una sola entrada por external_id (la primera fila gana).
    if (!campaignsByExternal.has(externalId)) {
      campaignsByExternal.set(externalId, {
        publisher: "gads",
        external_id: externalId,
        name: name || externalId,
        type: mapType(typeRaw),
        type_raw: typeRaw || null,
        status: mapStatus(statusRaw),
        status_raw: statusRaw || null,
      });
    }

    // raw_payload: la fila cruda con headers como keys (para auditoría).
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
      cost_ars: Number(toFloat(cost).toFixed(2)),
      revenue_ars: Number(toFloat(revenue).toFixed(2)),
      raw_payload: rawPayload,
    });
  }

  return {
    campaigns: Array.from(campaignsByExternal.values()),
    facts,
  };
}
