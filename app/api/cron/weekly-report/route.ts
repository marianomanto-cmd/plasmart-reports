// API Route: reporte semanal por mail.
//
// Trigger: pg_cron en Supabase, lunes 18:30 ART (21:30 UTC), 30 min después
// del ingest. Auth: header `Authorization: Bearer <CRON_SECRET>`.
//
// Flujo:
//   1. Valida el shared secret.
//   2. Computa rango = últimos 7 días.
//   3. Fetcha datos vía service role (sin user session).
//   4. Genera análisis Corey Haines con Claude (siempre fresco — sin cache:
//      el reporte semanal siempre quiere los datos más recientes).
//   5. Renderiza HTML con KPIs + análisis + 2 charts SVG inline.
//   6. Envía vía Resend a REPORT_RECIPIENTS.
//   7. Loguea en ai_analysis_log con user_email = "cron@weekly".
//
// Vercel: maxDuration 60s (paid plan permite hasta 300s; con Hobby quedamos
// justos pero el análisis Corey suele tardar 20-40s).

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  buildCoreySystemPrompt,
  buildCoreyUserContent,
} from "@/lib/ai/corey-prompt";
import { renderWeeklyReportHtml } from "@/lib/email/render";
import type {
  CampaignAnomalies,
  CampaignRow,
  DailyByPublisherPoint,
  DashboardFilters,
  DashboardKpis,
  Ga4Kpis,
  Ga4SourceMediumRow,
  KpiTotals,
  Publisher,
  PublisherComparison,
  PublisherTotals,
} from "@/lib/types";

export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = Number(process.env.ANTHROPIC_COREY_MAX_TOKENS ?? 3500);

interface ResponseBody {
  ok: boolean;
  message: string;
  durationMs?: number;
  recipientsCount?: number;
}

export async function POST(request: Request) {
  // ---- 1. Auth: shared secret ----
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET no configurada" } satisfies ResponseBody,
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, message: "No autorizado" } satisfies ResponseBody,
      { status: 401 },
    );
  }

  // ---- 2. Env de mail ----
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REPORT_FROM_EMAIL;
  const recipientsRaw = process.env.REPORT_RECIPIENTS;
  if (!resendKey || !fromEmail || !recipientsRaw) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Faltan envs: RESEND_API_KEY / REPORT_FROM_EMAIL / REPORT_RECIPIENTS",
      } satisfies ResponseBody,
      { status: 500 },
    );
  }
  const recipients = recipientsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (recipients.length === 0) {
    return NextResponse.json(
      { ok: false, message: "REPORT_RECIPIENTS vacío" } satisfies ResponseBody,
      { status: 500 },
    );
  }

  // ---- 3. Rango + filtros sintéticos ----
  const startedAt = Date.now();
  const toIso = todayIsoArt();
  const fromIso = shiftIso(toIso, -6); // 7 días incluyendo hoy

  const filters: DashboardFilters = {
    from: fromIso,
    to: toIso,
    publisher: undefined,
    type: undefined,
    campaignId: undefined,
    compare: "previous",
  };

  // ---- 4. Fetch de datos (service role bypasea RLS) ----
  const supabase = createServiceRoleClient();

  let kpis: DashboardKpis;
  let topCampaigns: CampaignRow[];
  let dailyByPublisher: DailyByPublisherPoint[];
  let comparison: PublisherComparison;
  let anomaliesMap: Map<string, CampaignAnomalies>;
  let ga4Kpis: Ga4Kpis;
  let ga4Top: Ga4SourceMediumRow[];

  try {
    [
      kpis,
      topCampaigns,
      dailyByPublisher,
      comparison,
      anomaliesMap,
      ga4Kpis,
      ga4Top,
    ] = await Promise.all([
      fetchKpisInline(supabase, filters),
      fetchCampaignRowsInline(supabase, filters, 15),
      fetchDailyByPublisherInline(supabase, filters),
      fetchPublisherComparisonInline(supabase, filters),
      fetchCampaignAnomaliesInline(supabase, filters),
      fetchGa4KpisInline(supabase, fromIso, toIso),
      fetchGa4SourceMediumInline(supabase, fromIso, toIso, 10),
    ]);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: `Error obteniendo datos: ${(err as Error).message}`,
      } satisfies ResponseBody,
      { status: 500 },
    );
  }

  // ---- 5. Claude (Corey Haines prompt, sin cache: siempre fresh) ----
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "ANTHROPIC_API_KEY no configurada" } satisfies ResponseBody,
      { status: 500 },
    );
  }

  const systemPrompt = await buildCoreySystemPrompt();
  const userContent = buildCoreyUserContent({
    filters,
    kpis,
    topCampaigns,
    ga4Kpis,
    ga4Top,
    comparison,
    anomalies: Array.from(anomaliesMap.values()),
    comparePeriodLabel: "7 días previos al período",
  });

  const client = new Anthropic({ apiKey });
  let analysisContent: string;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  try {
    const claudeResponse = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContent }],
    });
    analysisContent = claudeResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    promptTokens = claudeResponse.usage?.input_tokens ?? null;
    completionTokens = claudeResponse.usage?.output_tokens ?? null;
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: `Claude API: ${(err as Error).message}` } satisfies ResponseBody,
      { status: 502 },
    );
  }

  if (!analysisContent) {
    return NextResponse.json(
      { ok: false, message: "Claude devolvió respuesta vacía" } satisfies ResponseBody,
      { status: 502 },
    );
  }

  // ---- 6. Render HTML + envío Resend ----
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://plasmart-reports.vercel.app";
  const html = renderWeeklyReportHtml({
    fromIso,
    toIso,
    kpis,
    topCampaigns,
    dailyByPublisher,
    analysisMarkdown: analysisContent,
    appUrl,
  });

  const subject = `Reporte semanal Plasmart · ${humanRange(fromIso, toIso)}`;

  const resend = new Resend(resendKey);
  try {
    const { error: sendErr } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html,
    });
    if (sendErr) {
      return NextResponse.json(
        { ok: false, message: `Resend: ${sendErr.message}` } satisfies ResponseBody,
        { status: 502 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: `Resend: ${(err as Error).message}` } satisfies ResponseBody,
      { status: 502 },
    );
  }

  const durationMs = Date.now() - startedAt;

  // ---- 7. Log en ai_analysis_log ----
  const { error: logErr } = await supabase.from("ai_analysis_log").insert({
    user_email: "cron@weekly",
    period_from: fromIso,
    period_to: toIso,
    compare_mode: filters.compare,
    publisher: null,
    campaign_type: null,
    campaign_id: null,
    data_max_date: toIso,
    model_used: `${MODEL} (corey-cron)`,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    duration_ms: durationMs,
    content: analysisContent,
  });
  if (logErr) {
    console.warn("No se pudo loguear el cron:", logErr.message);
  }

  return NextResponse.json({
    ok: true,
    message: `Reporte enviado a ${recipients.length} destinatarios`,
    durationMs,
    recipientsCount: recipients.length,
  } satisfies ResponseBody);
}

// ===== Helpers de fecha =====

function todayIsoArt(): string {
  // Argentina = UTC-3. Lo simulamos sumando offset al UTC.
  const now = new Date();
  const art = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return art.toISOString().slice(0, 10);
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function humanRange(fromIso: string, toIso: string): string {
  const fmt = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
  return `${fmt.format(new Date(`${fromIso}T00:00:00Z`))} — ${fmt.format(new Date(`${toIso}T00:00:00Z`))}`;
}

function shiftRange(
  fromIso: string,
  toIso: string,
  daysBack: number,
): { from: string; to: string } {
  return { from: shiftIso(fromIso, -daysBack), to: shiftIso(toIso, -daysBack) };
}

// ===== Helpers de queries (inline, service-role) =====
// Estos helpers duplican parcialmente la lógica de @/lib/queries.ts porque
// las funciones de allí están atadas al client de Supabase con cookie de
// usuario. En este cron no hay sesión.

type Supa = ReturnType<typeof createServiceRoleClient>;

async function fetchTotalsInline(
  supabase: Supa,
  from: string,
  to: string,
): Promise<KpiTotals> {
  const { data, error } = await supabase.rpc("dashboard_kpi_totals", {
    p_from: from,
    p_to: to,
    p_publisher: null,
    p_type: null,
    p_campaign_id: null,
  });
  if (error) throw new Error(`kpi_totals: ${error.message}`);
  const row = (data ?? [])[0] ?? {};
  return {
    cost: Number(row.cost ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    conversions: Number(row.conversions ?? 0),
  };
}

async function fetchKpisInline(
  supabase: Supa,
  filters: DashboardFilters,
): Promise<DashboardKpis> {
  const days = daysBetween(filters.from, filters.to);
  const prev = shiftRange(filters.from, filters.to, days);
  const [current, previous] = await Promise.all([
    fetchTotalsInline(supabase, filters.from, filters.to),
    fetchTotalsInline(supabase, prev.from, prev.to),
  ]);
  const k = (cur: number, prv: number) => ({
    current: cur,
    previous: prv,
    deltaPct: prv === 0 ? (cur === 0 ? 0 : null) : ((cur - prv) / prv) * 100,
  });
  return {
    cost: k(current.cost, previous.cost),
    impressions: k(current.impressions, previous.impressions),
    clicks: k(current.clicks, previous.clicks),
    conversions: k(current.conversions, previous.conversions),
  };
}

async function fetchCampaignRowsInline(
  supabase: Supa,
  filters: DashboardFilters,
  limit: number,
): Promise<CampaignRow[]> {
  const { data, error } = await supabase.rpc("dashboard_campaign_rows", {
    p_from: filters.from,
    p_to: filters.to,
    p_publisher: filters.publisher ?? null,
    p_type: filters.type ?? null,
    p_campaign_id: filters.campaignId ?? null,
    p_limit: limit,
  });
  if (error) throw new Error(`campaign_rows: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    campaignId: String(r.campaign_id),
    name: String(r.name),
    publisher: r.publisher as Publisher,
    type: String(r.type),
    cost: Number(r.cost ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    conversions: Number(r.conversions ?? 0),
    ctr: Number(r.ctr ?? 0),
    cpc: Number(r.cpc ?? 0),
    cpa: Number(r.cpa ?? 0),
  }));
}

async function fetchDailyByPublisherInline(
  supabase: Supa,
  filters: DashboardFilters,
): Promise<DailyByPublisherPoint[]> {
  const { data, error } = await supabase.rpc("dashboard_daily_by_publisher", {
    p_from: filters.from,
    p_to: filters.to,
    p_type: filters.type ?? null,
    p_campaign_id: filters.campaignId ?? null,
  });
  if (error) throw new Error(`daily_by_publisher: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    date: String(r.date),
    publisher: r.publisher as Publisher,
    cost: Number(r.cost ?? 0),
  }));
}

async function fetchPublisherComparisonInline(
  supabase: Supa,
  filters: DashboardFilters,
): Promise<PublisherComparison> {
  const { data, error } = await supabase.rpc("dashboard_publisher_comparison", {
    p_from: filters.from,
    p_to: filters.to,
    p_type: filters.type ?? null,
    p_campaign_id: filters.campaignId ?? null,
  });
  if (error) throw new Error(`publisher_comparison: ${error.message}`);

  const rows = data ?? [];
  const toTotals = (r: Record<string, unknown>): PublisherTotals => ({
    publisher: r.publisher as Publisher,
    cost: Number(r.cost ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    conversions: Number(r.conversions ?? 0),
    ctr: Number(r.ctr ?? 0),
    cpc: Number(r.cpc ?? 0),
    cpm: Number(r.cpm ?? 0),
    cpa: Number(r.cpa ?? 0),
    spendShare: Number(r.spend_share ?? 0),
    conversionShare: Number(r.conversion_share ?? 0),
  });

  const gadsRow = rows.find(
    (r: Record<string, unknown>) => r.publisher === "gads",
  );
  const metaRow = rows.find(
    (r: Record<string, unknown>) => r.publisher === "meta",
  );

  const gads = gadsRow ? toTotals(gadsRow) : null;
  const meta = metaRow ? toTotals(metaRow) : null;

  return {
    gads,
    meta,
    totals: {
      cost: (gads?.cost ?? 0) + (meta?.cost ?? 0),
      impressions: (gads?.impressions ?? 0) + (meta?.impressions ?? 0),
      clicks: (gads?.clicks ?? 0) + (meta?.clicks ?? 0),
      conversions: (gads?.conversions ?? 0) + (meta?.conversions ?? 0),
    },
  };
}

async function fetchCampaignAnomaliesInline(
  supabase: Supa,
  filters: DashboardFilters,
): Promise<Map<string, CampaignAnomalies>> {
  const { data, error } = await supabase.rpc("dashboard_campaign_anomalies", {
    p_from: filters.from,
    p_to: filters.to,
    p_publisher: filters.publisher ?? null,
    p_type: filters.type ?? null,
    p_campaign_id: filters.campaignId ?? null,
  });
  if (error) throw new Error(`campaign_anomalies: ${error.message}`);
  const map = new Map<string, CampaignAnomalies>();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    map.set(String(r.campaign_id), {
      campaignId: String(r.campaign_id),
      isLearning: Boolean(r.is_learning),
      cpcIncreased: Boolean(r.cpc_increased),
      isWasteful: Boolean(r.is_wasteful),
    });
  }
  return map;
}

async function fetchGa4KpisInline(
  supabase: Supa,
  from: string,
  to: string,
): Promise<Ga4Kpis> {
  const { data, error } = await supabase.rpc("dashboard_ga4_totals", {
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(`ga4_totals: ${error.message}`);
  const row = (data ?? [])[0] ?? {};

  const days = daysBetween(from, to);
  const prev = shiftRange(from, to, days);
  const { data: prevData } = await supabase.rpc("dashboard_ga4_totals", {
    p_from: prev.from,
    p_to: prev.to,
  });
  const prevRow = (prevData ?? [])[0] ?? {};

  const k = (cur: number, prv: number) => ({
    current: cur,
    previous: prv,
    deltaPct: prv === 0 ? (cur === 0 ? 0 : null) : ((cur - prv) / prv) * 100,
  });

  return {
    sessions: k(Number(row.sessions ?? 0), Number(prevRow.sessions ?? 0)),
    users: k(
      Number(row.active_users ?? 0),
      Number(prevRow.active_users ?? 0),
    ),
    keyEvents: k(Number(row.key_events ?? 0), Number(prevRow.key_events ?? 0)),
    bounceRate: k(
      Number(row.bounce_rate ?? 0),
      Number(prevRow.bounce_rate ?? 0),
    ),
  };
}

async function fetchGa4SourceMediumInline(
  supabase: Supa,
  from: string,
  to: string,
  limit: number,
): Promise<Ga4SourceMediumRow[]> {
  const { data, error } = await supabase.rpc("dashboard_ga4_source_medium", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });
  if (error) throw new Error(`ga4_source_medium: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    source: String(r.source ?? ""),
    medium: String(r.medium ?? ""),
    sessions: Number(r.sessions ?? 0),
    users: Number(r.active_users ?? 0),
    keyEvents: Number(r.key_events ?? 0),
    bounceRate: Number(r.bounce_rate ?? 0),
  }));
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
}
