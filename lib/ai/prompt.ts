// Builder del prompt para el análisis automático de Claude.
// Separamos system prompt (constante, define rol) de user content
// (variable, contiene los datos del período).

import type {
  CampaignRow,
  DashboardFilters,
  DashboardKpis,
  Ga4Kpis,
  Ga4SourceMediumRow,
} from "@/lib/types";
import { ACCOUNT_CONTEXT } from "./account-context";

// ---- System prompt (rol + restricciones + formato) -----------------

export const SYSTEM_PROMPT = `
Sos un analista senior de marketing digital especializado en e-commerce
industrial. Tu cliente es Plasmart, descripto en el contexto que sigue.

Tu trabajo: analizar performance de campañas en Google Ads y Meta Ads,
y tráfico de Google Analytics 4, para generar entre 3 y 5 recomendaciones
puntuales y accionables que la gerencia pueda ejecutar esta semana.

REGLAS DURAS:
- Respondé siempre en español rioplatense, tono profesional pero directo.
- Citá NÚMEROS CONCRETOS. Si decís que algo subió, decí cuánto.
- Citá NOMBRES DE CAMPAÑA reales cuando hablés de campañas específicas.
- NUNCA inventés datos. Si los datos son insuficientes para una
  recomendación, decilo explícitamente.
- Priorizá por impacto comercial estimado, no por orden alfabético.

FORMATO DE RESPUESTA (markdown):
Devolvé entre 3 y 5 recomendaciones. Cada una con esta estructura exacta:

**[Título corto y accionable]**
[1-2 oraciones con el insight y la evidencia numérica.]
→ Acción: [qué hacer concretamente esta semana.]

Sin preámbulos. Sin conclusiones. Solo las recomendaciones, una debajo
de la otra, separadas por una línea en blanco.

CONTEXTO DE LA CUENTA:
${ACCOUNT_CONTEXT}
`.trim();

// ---- User content (datos del período) ------------------------------

interface BuildUserContentArgs {
  filters: DashboardFilters;
  kpis: DashboardKpis;
  topCampaigns: CampaignRow[];
  ga4Kpis: Ga4Kpis;
  ga4Top: Ga4SourceMediumRow[];
  comparePeriodLabel: string;
}

export function buildUserContent(args: BuildUserContentArgs): string {
  const { filters, kpis, topCampaigns, ga4Kpis, ga4Top, comparePeriodLabel } = args;

  // Top 10 simplificado: solo lo necesario para el análisis.
  const topSlim = topCampaigns.slice(0, 10).map((c) => ({
    name: c.name,
    publisher: c.publisher,
    type: c.type,
    cost_ars: round(c.cost),
    impressions: c.impressions,
    clicks: c.clicks,
    conversions: round2(c.conversions),
    ctr_pct: round2(c.ctr * 100),
    cpc_ars: round(c.cpc),
    cpa_ars: c.conversions > 0 ? round(c.cpa) : null,
  }));

  const ga4Slim = ga4Top.slice(0, 10).map((r) => ({
    source: r.source,
    medium: r.medium,
    sessions: r.sessions,
    users: r.users,
    key_events: round2(r.keyEvents),
    bounce_rate_pct: round2(r.bounceRate * 100),
  }));

  const payload = {
    period: { from: filters.from, to: filters.to },
    compare_against: comparePeriodLabel,
    paid_campaigns: {
      totals: {
        cost_ars: round(kpis.cost.current),
        impressions: kpis.impressions.current,
        clicks: kpis.clicks.current,
        conversions: round2(kpis.conversions.current),
      },
      deltas_vs_compare_pct: {
        cost: kpis.cost.deltaPct,
        impressions: kpis.impressions.deltaPct,
        clicks: kpis.clicks.deltaPct,
        conversions: kpis.conversions.deltaPct,
      },
      top_campaigns_by_cost: topSlim,
    },
    web_traffic_ga4: {
      totals: {
        sessions: ga4Kpis.sessions.current,
        users: ga4Kpis.users.current,
        key_events: round2(ga4Kpis.keyEvents.current),
        bounce_rate_pct: round2(ga4Kpis.bounceRate.current * 100),
      },
      deltas_vs_compare_pct: {
        sessions: ga4Kpis.sessions.deltaPct,
        users: ga4Kpis.users.deltaPct,
        key_events: ga4Kpis.keyEvents.deltaPct,
        bounce_rate: ga4Kpis.bounceRate.deltaPct,
      },
      top_source_medium: ga4Slim,
    },
  };

  return [
    "Datos del período a analizar (en JSON):",
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
    "Generá las recomendaciones siguiendo el formato indicado en las reglas.",
  ].join("\n");
}

function round(n: number): number {
  return Math.round(n);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
