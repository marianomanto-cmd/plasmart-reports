// Normaliza el sheet exportado por el addon "Google Analytics" para GA4.
// El sheet tiene metadata arriba ("Last Run On", "Total Results", etc.) y dos
// secciones de datos ("Totals For All Results" y "Results Breakdown") con sus
// propios headers. Solo nos interesa el breakdown.

import { GaFactRow } from "../../types.ts";

// Encuentra el ÚLTIMA fila que arranca con "date" (case-insensitive) — esa es
// la cabecera del breakdown, los datos reales empiezan justo después.
function findLastDateHeaderIndex(rows: string[][]): number {
  let lastIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const cell = (rows[i]?.[0] ?? "").trim().toLowerCase();
    if (cell === "date") lastIdx = i;
  }
  return lastIdx;
}

// Convierte "20260502" a "2026-05-02". Si no matchea el formato, devuelve "".
function parseGaDate(raw: string): string {
  if (!raw) return "";
  const m = String(raw).trim().match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function toInt(value: string): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = parseInt(String(value).replace(/[.,]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

// Parser tolerante para los números medio rotos que tira el addon de GA
// (ej. "3.523.925.179.27" o "0.4523"). Estrategia:
//   1) si parsea limpio, listo.
//   2) si tiene varios puntos, asumimos que todos son separadores de miles
//      excepto el último (decimal). Si igual no parsea, retornamos 0.
export function parseGaNumber(value: string): number {
  if (value === undefined || value === null || value === "") return 0;
  const s = String(value).trim();
  if (s === "") return 0;

  const direct = parseFloat(s);
  // Solo confiamos en el parse directo si no hay puntos múltiples.
  const dotCount = (s.match(/\./g) ?? []).length;
  if (Number.isFinite(direct) && dotCount <= 1) return direct;

  if (dotCount > 1) {
    // Todos los puntos menos el último son separadores de miles.
    const lastDot = s.lastIndexOf(".");
    const intPart = s.slice(0, lastDot).replace(/\./g, "");
    const decPart = s.slice(lastDot + 1);
    const n = parseFloat(`${intPart}.${decPart}`);
    if (Number.isFinite(n)) return n;
  }

  return 0;
}

// Detecta el índice de la columna que matchea alguno de los nombres dados,
// case-insensitive y soportando prefijos (los headers de GA suelen venir
// truncados como "keyEvents:conv..." o "sessionKeyEven...").
function findCol(headers: string[], candidates: string[]): number {
  const norm = headers.map((h) => (h ?? "").trim().toLowerCase());
  for (const cand of candidates) {
    const c = cand.toLowerCase();
    const exact = norm.indexOf(c);
    if (exact !== -1) return exact;
  }
  for (const cand of candidates) {
    const c = cand.toLowerCase();
    const idx = norm.findIndex((h) => h.startsWith(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

// El header "keyEvents" puede aparecer varias veces (con y sin filtro de
// conversión). Queremos quedarnos con la ÚLTIMA aparición exacta.
function findLastKeyEventsCol(headers: string[]): number {
  const norm = headers.map((h) => (h ?? "").trim().toLowerCase());
  for (let i = norm.length - 1; i >= 0; i--) {
    if (norm[i] === "keyevents") return i;
  }
  return -1;
}

export function normalizeGa4Rows(rows: string[][]): GaFactRow[] {
  if (rows.length === 0) return [];

  const headerIdx = findLastDateHeaderIndex(rows);
  if (headerIdx === -1) return [];

  const headers = rows[headerIdx];
  const dataRows = rows.slice(headerIdx + 1);

  const idx = {
    date: 0,
    source: findCol(headers, ["sessionSource", "source"]),
    medium: findCol(headers, ["sessionMedium", "medium"]),
    sessions: findCol(headers, ["sessions"]),
    totalUsers: findCol(headers, ["totalUsers"]),
    newUsers: findCol(headers, ["newUsers"]),
    pageViews: findCol(headers, ["screenPageViews", "pageViews"]),
    avgDuration: findCol(headers, ["averageSessionDuration"]),
    bounceRate: findCol(headers, ["bounceRate"]),
    keyEvents: findLastKeyEventsCol(headers),
  };

  const result: GaFactRow[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const dateRaw = row[idx.date];
    const date = parseGaDate(dateRaw);
    if (!date) continue; // saltea filas sin fecha válida (cierres, totales, etc.)

    const sourceVal = (row[idx.source] ?? "").trim() || "(not set)";
    const mediumVal = (row[idx.medium] ?? "").trim() || "(not set)";

    const rawPayload: Record<string, unknown> = {};
    for (let i = 0; i < headers.length; i++) {
      rawPayload[headers[i] ?? `col_${i}`] = row[i] ?? null;
    }

    result.push({
      date,
      source: sourceVal,
      medium: mediumVal,
      sessions: toInt(row[idx.sessions]),
      total_users: toInt(row[idx.totalUsers]),
      new_users: toInt(row[idx.newUsers]),
      page_views: toInt(row[idx.pageViews]),
      key_events: idx.keyEvents !== -1
        ? Number(parseGaNumber(row[idx.keyEvents]).toFixed(4))
        : 0,
      avg_session_duration: idx.avgDuration !== -1
        ? Number(parseGaNumber(row[idx.avgDuration]).toFixed(2))
        : 0,
      bounce_rate: idx.bounceRate !== -1
        ? Number(parseGaNumber(row[idx.bounceRate]).toFixed(4))
        : 0,
      raw_payload: rawPayload,
    });
  }

  return result;
}
