// API Route: análisis automático de Claude para el dashboard.
// Flujo:
//   1. Parsea y valida los filtros desde el body.
//   2. Busca la fecha máxima de datos en el período (clave de cache).
//   3. Mira si hay un análisis cacheado para (filtros + maxDate).
//   4. Si hay → devuelve el cacheado.
//   5. Si no → arma el contexto, llama a Claude, guarda el resultado.
//
// La API key NUNCA sale del server. El cliente solo ve el markdown final.

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { parseFilters } from "@/lib/filters";
import {
  fetchCampaignRows,
  fetchGa4Kpis,
  fetchGa4SourceMedium,
  fetchKpis,
} from "@/lib/queries";
import { hashFilters } from "@/lib/ai/hash";
import { buildSystemPrompt, buildUserContent } from "@/lib/ai/prompt";
import { contextCacheKey, loadAnalysisContext } from "@/lib/ai/account-context";
import { rangeDays } from "@/lib/dates";
import type { DashboardFilters } from "@/lib/types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS ?? 1024);
const COOLDOWN_MINUTES = 60;

interface AnalyzeRequestBody {
  filters: Record<string, string | string[] | undefined>;
  forceRegenerate?: boolean;
  // Override del campo "focus" del contexto editable, solo para esta
  // corrida. Si está vacío o ausente, se usa el focus persistido.
  focusOverride?: string;
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
  // ---- 1. Auth check ----
  // El middleware ya hace el guard de dominio, pero re-validamos acá por
  // si alguien llamara a esta API desde fuera del dashboard.
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

  // El contexto editable se carga acá: necesitamos updated_at + el
  // focusOverride para construir la clave de cache, y el objeto entero
  // para armar el system prompt si toca generar uno nuevo.
  const analysisContext = await loadAnalysisContext(supabase);
  const ctxKey = contextCacheKey(analysisContext, focusOverride);

  // ---- 3. Determinar la fecha máxima de datos ----
  // Es parte de la clave de cache: si los datos del período se actualizan
  // (lunes nuevo), el hash cambia y el cache se invalida solo.
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

  const filtersHash = hashFilters(filters, "default", ctxKey);

  // ---- 4. Lookup en cache ----
  if (!forceRegenerate) {
    const { data: cacheData, error: cacheErr } = await supabase.rpc(
      "dashboard_ai_cache_lookup",
      { p_filters_hash: filtersHash, p_data_max_date: maxDate },
    );

    if (cacheErr) {
      // Si el lookup falla, no rompemos: seguimos a generar uno nuevo.
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
  // No hubo cache hit → vamos a llamar a Claude. Antes verificamos que el
  // usuario no haya hecho otra generación de Resumen en los últimos 60 min.
  // Las llamadas que resolvieron por cache NO cuentan (ai_analysis_log solo
  // registra llamadas reales al modelo).
  const { data: lastCallData, error: lastCallErr } = await supabase.rpc(
    "dashboard_last_ai_call",
    {
      p_user_email: user.email,
      p_analyzer: "analyze",
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
        error: `Cooldown activo. Próximo análisis disponible en ${remaining} ${remaining === 1 ? "minuto" : "minutos"}.`,
        cooldownMinutesRemaining: remaining,
      } satisfies CooldownResponseBody,
      { status: 429 },
    );
  }

  // ---- 5. Generar análisis nuevo ----
  // Las queries de datos en paralelo. No traemos KPIs derivados de campañas
  // separadas: usamos los mismos endpoints que el dashboard.
  const startedAt = Date.now();
  let kpis;
  let topCampaigns;
  let ga4Kpis;
  let ga4Top;
  try {
    [kpis, topCampaigns, ga4Kpis, ga4Top] = await Promise.all([
      fetchKpis(filters),
      fetchCampaignRows(filters, 10),
      fetchGa4Kpis(filters),
      fetchGa4SourceMedium(filters.from, filters.to, 10),
    ]);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Error obteniendo datos: ${(err as Error).message}`,
      },
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

  const userContent = buildUserContent({
    filters,
    kpis,
    topCampaigns,
    ga4Kpis,
    ga4Top,
    comparePeriodLabel,
  });

  // Llamada a Claude
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
    claudeResponse = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(analysisContext, focusOverride),
      messages: [{ role: "user", content: userContent }],
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Claude API: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  // Extraer el texto de la respuesta. Claude devuelve un array de blocks;
  // tomamos solo los de tipo "text" y los concatenamos.
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

  // ---- 6. Guardar en cache ----
  // Si el insert falla, no rompemos: ya tenemos la respuesta para devolver.
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

  // ---- 7. Loguear en ai_analysis_log ----
  // Una fila por cada llamada exitosa al modelo. Sin dedupe — es audit log.
  const { error: logErr } = await supabase.from("ai_analysis_log").insert({
    user_email: user.email,
    period_from: filters.from,
    period_to: filters.to,
    compare_mode: filters.compare,
    publisher: filters.publisher ?? null,
    campaign_type: filters.type ?? null,
    campaign_id: filters.campaignId ?? null,
    data_max_date: maxDate,
    model_used: MODEL,
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
