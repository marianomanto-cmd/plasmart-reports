// API Route: análisis del tab "Corey Haines".
// Aplica las marketing skills de coreyhaines31/marketingskills al período
// seleccionado y devuelve un reporte ejecutivo justificado.
//
// Mismo patrón que /api/analyze (cache + log), pero:
//   - inyecta SKILL.md como bloque de contexto experto en el system prompt
//   - usa prompt caching de Anthropic sobre el system block (es estable y largo)
//   - hash con namespace "corey" para no chocar con el cache del Resumen
//   - max_tokens más alto porque el reporte es más extenso

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { parseFilters } from "@/lib/filters";
import {
  fetchAdRows,
  fetchAdsetRows,
  fetchCampaignAnomalies,
  fetchCampaignRows,
  fetchGa4Kpis,
  fetchGa4SourceMedium,
  fetchKpis,
  fetchPublisherComparison,
} from "@/lib/queries";
import { hashFilters } from "@/lib/ai/hash";
import {
  buildCoreySystemPrompt,
  buildCoreyUserContent,
} from "@/lib/ai/corey-prompt";
import { contextCacheKey, loadAnalysisContext } from "@/lib/ai/account-context";
import { rangeDays } from "@/lib/dates";
import type { AnalysisGranularity, DashboardFilters } from "@/lib/types";

const VALID_GRANULARITIES: AnalysisGranularity[] = ["campaign", "adset", "ad"];

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = Number(process.env.ANTHROPIC_COREY_MAX_TOKENS ?? 3500);
const NAMESPACE = "corey";
const COOLDOWN_MINUTES = 60;

interface AnalyzeRequestBody {
  filters: Record<string, string | string[] | undefined>;
  forceRegenerate?: boolean;
  // Override del campo "focus" del contexto editable, solo para esta
  // corrida. Si está vacío o ausente, se usa el focus persistido.
  focusOverride?: string;
  // Granularidad del análisis (v1.4). Default: "campaign". Si llega
  // "adset" o "ad", se traen filas extra (solo si hay data ingestada)
  // y se inyectan en el prompt. Se incluye en el filtersHash para que
  // la cache no devuelva un análisis a otro nivel.
  granularity?: AnalysisGranularity;
}

interface AnalyzeResponseBody {
  content: string;
  fromCache: boolean;
  generatedAt: string;
  modelUsed: string;
}

interface CooldownResponseBody {
  error: string;
  cooldownMinutesRemaining: number;
}

export async function POST(request: Request) {
  // ---- 1. Auth ----
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email?.endsWith("@transfil.com.ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // ---- 2. Parse del body ----
  let body: AnalyzeRequestBody;
  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const filters: DashboardFilters = parseFilters(body.filters ?? {});
  const forceRegenerate = body.forceRegenerate === true;
  const focusOverride =
    typeof body.focusOverride === "string" && body.focusOverride.trim().length > 0
      ? body.focusOverride.trim()
      : undefined;
  const granularity: AnalysisGranularity =
    body.granularity && VALID_GRANULARITIES.includes(body.granularity)
      ? body.granularity
      : "campaign";

  // Adset/ad solo aplica para Google Ads. Si el publisher no es "gads"
  // (o no hay publisher → "Todos"), forzamos campaign para evitar payloads
  // que combinen Meta sin granularidad disponible.
  const effectiveGranularity: AnalysisGranularity =
    granularity !== "campaign" && filters.publisher !== "gads"
      ? "campaign"
      : granularity;

  const analysisContext = await loadAnalysisContext(supabase);
  const ctxKey = contextCacheKey(analysisContext, focusOverride);

  // ---- 3. Fecha máxima de datos (clave de cache) ----
  const { data: maxDateData, error: maxDateErr } = await supabase.rpc(
    "dashboard_max_data_date",
    { p_from: filters.from, p_to: filters.to },
  );
  if (maxDateErr) {
    return NextResponse.json(
      { error: `Error consultando datos: ${maxDateErr.message}` },
      { status: 500 },
    );
  }

  const maxDate = maxDateData as string | null;
  if (!maxDate) {
    return NextResponse.json(
      {
        content:
          "*Sin datos en el período seleccionado para generar un análisis.*",
        fromCache: false,
        generatedAt: new Date().toISOString(),
        modelUsed: "—",
      } satisfies AnalyzeResponseBody,
      { status: 200 },
    );
  }

  // La granularidad entra en el ctxKey: dos análisis con misma data
  // pero distinto nivel deben cachearse por separado.
  const filtersHash = hashFilters(
    filters,
    NAMESPACE,
    `${ctxKey}::g=${effectiveGranularity}`,
  );

  // ---- 4. Lookup en cache ----
  if (!forceRegenerate) {
    const { data: cacheData, error: cacheErr } = await supabase.rpc(
      "dashboard_ai_cache_lookup",
      { p_filters_hash: filtersHash, p_data_max_date: maxDate },
    );

    if (cacheErr) {
      console.warn("Cache lookup falló:", cacheErr.message);
    } else if (cacheData && cacheData.length > 0) {
      const hit = cacheData[0];
      return NextResponse.json({
        content: hit.content,
        fromCache: true,
        generatedAt: hit.generated_at,
        modelUsed: hit.model_used,
      } satisfies AnalyzeResponseBody);
    }
  }

  // ---- 4.5. Cooldown ----
  // No hubo cache hit → llamada real a Claude. Bloqueamos si este usuario
  // ya generó un Corey Haines en los últimos 60 min.
  const { data: lastCallData, error: lastCallErr } = await supabase.rpc(
    "dashboard_last_ai_call",
    {
      p_user_email: user.email,
      p_analyzer: "corey",
      p_within_minutes: COOLDOWN_MINUTES,
    },
  );
  if (lastCallErr) {
    console.warn("Cooldown lookup falló:", lastCallErr.message);
  } else if (lastCallData && lastCallData.length > 0) {
    const minutesAgo = Number(lastCallData[0].minutes_ago);
    const remaining = Math.max(1, Math.ceil(COOLDOWN_MINUTES - minutesAgo));
    return NextResponse.json(
      {
        error: `Cooldown activo. Próximo reporte disponible en ${remaining} ${remaining === 1 ? "minuto" : "minutos"}.`,
        cooldownMinutesRemaining: remaining,
      } satisfies CooldownResponseBody,
      { status: 429 },
    );
  }

  // ---- 5. Datos del período ----
  const startedAt = Date.now();
  let kpis;
  let topCampaigns;
  let ga4Kpis;
  let ga4Top;
  let comparison;
  let anomaliesMap;
  let adsets: Awaited<ReturnType<typeof fetchAdsetRows>> | undefined;
  let ads: Awaited<ReturnType<typeof fetchAdRows>> | undefined;
  try {
    [kpis, topCampaigns, ga4Kpis, ga4Top, comparison, anomaliesMap] =
      await Promise.all([
        fetchKpis(filters),
        fetchCampaignRows(filters, 15),
        fetchGa4Kpis(filters),
        fetchGa4SourceMedium(filters.from, filters.to, 10),
        fetchPublisherComparison(filters),
        fetchCampaignAnomalies(filters),
      ]);

    // Drill-down opcional según granularidad solicitada.
    if (effectiveGranularity === "adset") {
      adsets = await fetchAdsetRows(filters, 30);
    } else if (effectiveGranularity === "ad") {
      ads = await fetchAdRows(filters, 30);
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Error obteniendo datos: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  const days = rangeDays(filters.from, filters.to);
  const comparePeriodLabel =
    filters.compare === "yoy"
      ? "mismo rango del año pasado"
      : filters.compare === "previous"
      ? `${days} días previos al período`
      : "sin comparación";

  // ---- 6. Build prompts ----
  const systemPrompt = await buildCoreySystemPrompt(
    analysisContext,
    focusOverride,
  );
  const userContent = buildCoreyUserContent({
    filters,
    kpis,
    topCampaigns,
    ga4Kpis,
    ga4Top,
    comparison,
    anomalies: Array.from(anomaliesMap.values()),
    comparePeriodLabel,
    granularity: effectiveGranularity,
    adsets,
    ads,
  });

  // ---- 7. Claude ----
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada" },
      { status: 500 },
    );
  }

  const client = new Anthropic({ apiKey });

  let claudeResponse;
  try {
    // Prompt caching sobre el system block: el bloque skills+instrucciones
    // pesa varios miles de tokens y es estable, así que el segundo request
    // del mismo modelo paga ~10% del costo de input por ese segmento.
    claudeResponse = await client.messages.create({
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
  } catch (err) {
    return NextResponse.json(
      { error: `Claude API: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const content = claudeResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!content) {
    return NextResponse.json(
      { error: "Claude devolvió respuesta vacía" },
      { status: 502 },
    );
  }

  const durationMs = Date.now() - startedAt;
  const promptTokens = claudeResponse.usage?.input_tokens ?? null;
  const completionTokens = claudeResponse.usage?.output_tokens ?? null;

  // ---- 8. Cache + log ----
  const { error: insertErr } = await supabase.from("ai_analysis_cache").insert({
    filters_hash: filtersHash,
    data_max_date: maxDate,
    model_used: MODEL,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    content,
  });
  if (insertErr) {
    console.warn("No se pudo guardar el análisis en cache:", insertErr.message);
  }

  const { error: logErr } = await supabase.from("ai_analysis_log").insert({
    user_email: user.email,
    period_from: filters.from,
    period_to: filters.to,
    compare_mode: filters.compare,
    publisher: filters.publisher ?? null,
    campaign_type: filters.type ?? null,
    campaign_id: filters.campaignId ?? null,
    data_max_date: maxDate,
    model_used: `${MODEL} (corey · ${effectiveGranularity})`,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    duration_ms: durationMs,
    content,
  });
  if (logErr) {
    console.warn("No se pudo guardar el análisis en el log:", logErr.message);
  }

  return NextResponse.json({
    content,
    fromCache: false,
    generatedAt: new Date().toISOString(),
    modelUsed: MODEL,
  } satisfies AnalyzeResponseBody);
}
