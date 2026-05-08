// Cliente para Google Analytics Data API (GA4) usando OAuth Refresh Token de
// un usuario humano. Optamos por este flow porque GA4 no nos dejó agregar el
// Service Account a la propiedad: el refresh token vive como secret y se
// canjea por un access token cada corrida.

import type { GaFactRow } from "../types.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA4_DATA_API_BASE = "https://analyticsdata.googleapis.com/v1beta";

interface RunReportRow {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

interface RunReportResponse {
  rows?: RunReportRow[];
  rowCount?: number;
}

// Convierte "20260502" → "2026-05-02". Si no matchea, devuelve "".
function parseGaDate(raw: string | undefined): string {
  if (!raw) return "";
  const m = raw.trim().match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function toIntSafe(v: string | undefined): number {
  if (!v) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function toFloatSafe(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Cambia el Refresh Token por un Access Token con duración ~1h.
export async function getGa4AccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN");

  if (!clientId) throw new Error("Falta la env var GOOGLE_OAUTH_CLIENT_ID");
  if (!clientSecret) {
    throw new Error("Falta la env var GOOGLE_OAUTH_CLIENT_SECRET");
  }
  if (!refreshToken) {
    throw new Error("Falta la env var GOOGLE_OAUTH_REFRESH_TOKEN");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Falló el refresh de access_token GA4 (${res.status}): ${text}`,
    );
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("La respuesta de Google no contiene access_token");
  }
  return data.access_token;
}

// Llama a GA4 Data API runReport y devuelve filas ya normalizadas para
// fact_ga_daily.
export async function fetchGa4Data(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GaFactRow[]> {
  const reqBody = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: "date" },
      { name: "sessionSource" },
      { name: "sessionMedium" },
    ],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "screenPageViews" },
      { name: "keyEvents" },
      { name: "averageSessionDuration" },
      { name: "bounceRate" },
    ],
    limit: 10000,
  };

  const url = `${GA4_DATA_API_BASE}/properties/${encodeURIComponent(
    propertyId,
  )}:runReport`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 runReport falló (${res.status}): ${text}`);
  }

  const data = (await res.json()) as RunReportResponse;
  const rows = data.rows ?? [];

  const result: GaFactRow[] = [];

  for (const row of rows) {
    const dims = row.dimensionValues ?? [];
    const mets = row.metricValues ?? [];

    const date = parseGaDate(dims[0]?.value);
    if (!date) continue; // saltea filas sin fecha válida

    result.push({
      date,
      source: (dims[1]?.value || "").trim() || "(not set)",
      medium: (dims[2]?.value || "").trim() || "(not set)",
      sessions: toIntSafe(mets[0]?.value),
      total_users: toIntSafe(mets[1]?.value),
      new_users: toIntSafe(mets[2]?.value),
      page_views: toIntSafe(mets[3]?.value),
      key_events: Number(toFloatSafe(mets[4]?.value).toFixed(4)),
      avg_session_duration: Number(toFloatSafe(mets[5]?.value).toFixed(2)),
      bounce_rate: Number(toFloatSafe(mets[6]?.value).toFixed(4)),
      raw_payload: row as unknown as Record<string, unknown>,
    });
  }

  return result;
}
