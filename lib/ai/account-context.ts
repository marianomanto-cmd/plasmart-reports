// Contexto editable que se inyecta en los prompts de Claude y Corey Haines.
// Antes vivía como string hardcodeado; ahora se persiste en la tabla
// analysis_context (singleton) y se edita desde el modal de la UI.
//
// Este archivo expone:
//   - FALLBACK_CONTEXT: usado si la tabla está vacía o falla la query.
//     Mantiene el sistema funcionando aún sin DB.
//   - loadAnalysisContext(supabase): lee la fila singleton.
//   - renderAccountContext(ctx, focusOverride): arma el bloque de texto
//     que se inyecta en los system prompts. Omite secciones vacías para
//     no llenar de placeholders.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisContext } from "@/lib/types";

// ---- Fallback estático ----------------------------------------------
// Si la migration v13 todavía no corrió o la query falla, usamos esto.
// Es el mismo texto que vivía en este archivo antes del refactor.

export const FALLBACK_CONTEXT: AnalysisContext = {
  company:
    "Plasmart es una empresa de Córdoba (Argentina) parte del grupo Transfil. Negocio: corte láser y plasma de acero, plus plegado CNC. Capacidades técnicas: corte láser hasta 6,35mm, plasma hasta 32mm, plegado CNC.",
  audience:
    "B2C: arquitectos, diseñadores, herreros, particulares con proyectos. B2B: industria metalmecánica, fabricantes de equipos, talleres. El cliente B2B vale órdenes de magnitud más que el B2C.",
  economics:
    "Moneda: pesos argentinos (ARS). Frecuencia de revisión: semanal. Mantener costos por adquisición sostenibles dadas las márgenes industriales.",
  tracking:
    "Cuentas activas: Google Ads, Meta Ads, GA4 (tráfico web). En Meta las campañas optimizan para mensajería: la métrica 'conversiones' son conversaciones de mensajería iniciadas (consultas, sumando todas las plataformas de mensajería — WhatsApp y Messenger), NO conversiones de píxel/web. Por eso el CPA de Meta es 'costo por consulta'. Las campañas de Meta con objetivo de alcance/awareness muestran 0 conversiones por diseño: evaluarlas por alcance, CPM y CTR, no por conversiones. En Google Ads, 'conversiones' mantiene su sentido habitual.",
  focus: "",
  decision: "",
  businessContext: "",
  scope: "",
  rules: "",
  outputTone: "",
  updatedAt: "1970-01-01T00:00:00.000Z",
  updatedBy: null,
};

// ---- Loader ----------------------------------------------------------

interface AnalysisContextRow {
  company: string | null;
  audience: string | null;
  economics: string | null;
  tracking: string | null;
  focus: string | null;
  decision: string | null;
  business_context: string | null;
  scope: string | null;
  rules: string | null;
  output_tone: string | null;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Lee la fila singleton de analysis_context. Si la tabla está vacía o
 * la query falla, devuelve FALLBACK_CONTEXT. No tira: el análisis tiene
 * que poder generarse aunque el contexto no esté disponible.
 */
export async function loadAnalysisContext(
  supabase: SupabaseClient,
): Promise<AnalysisContext> {
  const { data, error } = await supabase
    .from("analysis_context")
    .select(
      "company, audience, economics, tracking, focus, decision, business_context, scope, rules, output_tone, updated_at, updated_by",
    )
    .eq("id", 1)
    .maybeSingle<AnalysisContextRow>();

  if (error) {
    console.warn("loadAnalysisContext falló, usando fallback:", error.message);
    return FALLBACK_CONTEXT;
  }

  if (!data) return FALLBACK_CONTEXT;

  return {
    company: data.company ?? "",
    audience: data.audience ?? "",
    economics: data.economics ?? "",
    tracking: data.tracking ?? "",
    focus: data.focus ?? "",
    decision: data.decision ?? "",
    businessContext: data.business_context ?? "",
    scope: data.scope ?? "",
    rules: data.rules ?? "",
    outputTone: data.output_tone ?? "",
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  };
}

// ---- Renderer --------------------------------------------------------

/**
 * Arma el bloque de texto que se inyecta como "CONTEXTO DE LA CUENTA"
 * en los system prompts. Si un campo está vacío, omite esa sección
 * entera. Si focusOverride está presente, sobreescribe ctx.focus
 * (este es el input inline del dashboard).
 */
export function renderAccountContext(
  ctx: AnalysisContext,
  focusOverride?: string,
): string {
  const focus = (focusOverride?.trim() || ctx.focus || "").trim();

  const sections: Array<[string, string]> = [
    ["SOBRE EL CLIENTE", ctx.company],
    ["PÚBLICO OBJETIVO", ctx.audience],
    ["ECONOMÍA", ctx.economics],
    ["TRACKING Y CUENTAS", ctx.tracking],
    ["OBJETIVO DEL PERÍODO", focus],
    ["DECISIÓN POR TOMAR", ctx.decision],
    ["CONTEXTO DEL NEGOCIO", ctx.businessContext],
    ["ALCANCE (FOCO / EXCLUSIONES)", ctx.scope],
    ["REGLAS DURAS DEL CLIENTE", ctx.rules],
    ["TONO Y FORMATO PREFERIDO", ctx.outputTone],
  ];

  return sections
    .filter(([, value]) => value.trim().length > 0)
    .map(([label, value]) => `${label}:\n${value.trim()}`)
    .join("\n\n");
}

/**
 * Versión legible del contexto para incluir en el hash de cache.
 * Cambia → invalida cache. Usamos updated_at + focusOverride porque
 * el cuerpo del contexto ya está reflejado en updated_at (el trigger
 * lo toca en cada update).
 */
export function contextCacheKey(
  ctx: AnalysisContext,
  focusOverride?: string,
): string {
  const focus = focusOverride?.trim() ?? "";
  return `${ctx.updatedAt}|${focus}`;
}
