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
import { after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { parseFilters } from "@/lib/filters";
import {
  fetchCampaignAnomalies,
  fetchCampaignRows,
  fetchDailyTotals,
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
import { rangeDays } from "@/lib/dates";
import type { DashboardFilters } from "@/lib/types";
import { renderCoreyPdf } from "@/lib/pdf/render-corey-pdf";
import { sendCoreyReportEmail } from "@/lib/email/send-corey-report";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = Number(process.env.ANTHROPIC_COREY_MAX_TOKENS ?? 3500);
const NAMESPACE = "corey";

interface AnalyzeRequestBody {
  filters: Record<string, string | string[] | undefined>;
  forceRegenerate?: boolean;
}

interface AnalyzeResponseBody {
  content: string;
  fromCache: boolean;
  generatedAt: string;
  modelUsed: string;
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

  const filtersHash = hashFilters(filters, NAMESPACE);

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

  // ---- 5. Datos del período ----
  const startedAt = Date.now();
  let kpis;
  let topCampaigns;
  let ga4Kpis;
  let ga4Top;
  let comparison;
  let anomaliesMap;
  let daily;
  try {
    [kpis, topCampaigns, ga4Kpis, ga4Top, comparison, anomaliesMap, daily] =
      await Promise.all([
        fetchKpis(filters),
        fetchCampaignRows(filters, 15),
        fetchGa4Kpis(filters),
        fetchGa4SourceMedium(filters.from, filters.to, 10),
        fetchPublisherComparison(filters),
        fetchCampaignAnomalies(filters),
        fetchDailyTotals(filters),
      ]);
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
  const systemPrompt = await buildCoreySystemPrompt();
  const userContent = buildCoreyUserContent({
    filters,
    kpis,
    topCampaigns,
    ga4Kpis,
    ga4Top,
    comparison,
    anomalies: Array.from(anomaliesMap.values()),
    comparePeriodLabel,
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
    model_used: `${MODEL} (corey)`,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    duration_ms: durationMs,
    content,
  });
  if (logErr) {
    console.warn("No se pudo guardar el análisis en el log:", logErr.message);
  }

  const generatedAt = new Date().toISOString();

  // ---- 9. Email automático con PDF (fire-and-forget) ----
  // Sólo lo disparamos cuando el reporte es fresh (acá ya lo es). Si la
  // env var no está configurada, sendCoreyReportEmail devuelve skipped.
  after(async () => {
    try {
      const pdf = await renderCoreyPdf({
        filters,
        kpis,
        daily,
        comparison,
        topCampaigns,
        content,
        generatedAt,
        modelUsed: MODEL,
      });
      const result = await sendCoreyReportEmail({
        pdf,
        filters,
        generatedAt,
        modelUsed: MODEL,
      });
      if (!result.ok && !result.skipped) {
        console.warn("Envío de email Corey falló:", result.reason);
      } else if (result.skipped) {
        console.info("Envío de email Corey skip:", result.reason);
      } else {
        console.info("Email Corey enviado:", result.id);
      }
    } catch (err) {
      console.warn("Error generando PDF/email Corey:", (err as Error).message);
    }
  });

  return NextResponse.json({
    content,
    fromCache: false,
    generatedAt,
    modelUsed: MODEL,
  } satisfies AnalyzeResponseBody);
}
