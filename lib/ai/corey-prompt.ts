// Prompt builder para el tab "Corey Haines".
// Carga las skills relevantes desde .claude/skills/ y las inyecta como
// contexto experto en el system prompt. Cada skill aporta un framework
// distinto: paid-ads diagnostica campañas, ad-creative analiza creativos,
// analytics-tracking valida medición, marketing-ideas genera hipótesis,
// ab-test-setup propone tests, customer-research aporta lente de audiencia,
// competitor-profiling contextualiza vs competencia.

import { readFile } from "fs/promises";
import path from "path";
import type {
  AnalysisContext,
  CampaignAnomalies,
  CampaignRow,
  DashboardFilters,
  DashboardKpis,
  Ga4Kpis,
  Ga4SourceMediumRow,
  PublisherComparison,
} from "@/lib/types";
import { renderAccountContext } from "./account-context";

// ---- Skills aplicadas (orden importa: priorizan en el razonamiento) ----

const ACTIVE_SKILLS = [
  "paid-ads",
  "ad-creative",
  "analytics-tracking",
  "ab-test-setup",
  "marketing-ideas",
  "customer-research",
  "competitor-profiling",
] as const;

let cachedSkillsBlock: string | null = null;

/**
 * Lee los SKILL.md de las skills activas y los concatena en un solo bloque.
 * Cachea en memoria del proceso (Next.js server) — los archivos no cambian
 * entre requests dentro de la misma instancia.
 */
async function loadSkillsBlock(): Promise<string> {
  if (cachedSkillsBlock !== null) return cachedSkillsBlock;

  const skillsRoot = path.join(process.cwd(), ".claude", "skills");
  const parts: string[] = [];

  for (const skillName of ACTIVE_SKILLS) {
    const skillPath = path.join(skillsRoot, skillName, "SKILL.md");
    try {
      const raw = await readFile(skillPath, "utf-8");
      parts.push(`<skill name="${skillName}">\n${stripFrontmatter(raw)}\n</skill>`);
    } catch (err) {
      console.warn(`No se pudo cargar skill ${skillName}:`, (err as Error).message);
    }
  }

  cachedSkillsBlock = parts.join("\n\n");
  return cachedSkillsBlock;
}

/**
 * Saca el frontmatter YAML (--- ... ---) del comienzo del SKILL.md.
 * El frontmatter sirve para discovery automático en Claude Code, pero
 * acá lo cargamos siempre, no necesitamos esa metadata en el prompt.
 */
function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md.trim();
  const end = md.indexOf("\n---", 3);
  if (end === -1) return md.trim();
  return md.slice(end + 4).trim();
}

// ---- System prompt ----

const BASE_INSTRUCTIONS = `
Sos un consejo de expertos en marketing digital aplicado a e-commerce
industrial B2B/B2C. Cada SKILL en el bloque siguiente representa un
framework de un especialista distinto. Aplicalos TODOS al diagnóstico
de la cuenta de Plasmart con los datos que recibís en el mensaje del
usuario.

OBJETIVO:
Producir un reporte ejecutivo, justificado en datos, con recomendaciones
priorizadas que la gerencia pueda ejecutar en las próximas 1-2 semanas.

REGLAS DURAS:
- Respondé en español rioplatense, profesional pero directo.
- Citá números concretos del payload (cost_ars, ctr, cpa, etc.). Nunca
  inventes datos.
- Citá nombres de campaña reales cuando hablés de campañas específicas.
- Cada recomendación debe tener: insight cuantitativo, hipótesis sobre
  la causa, acción concreta, y métrica para validar el resultado.
- Si los datos son insuficientes para alguna sección, decilo
  explícitamente — no rellenes con genéricos.
- Priorizá por impacto comercial estimado, no por orden alfabético.
- Tené en cuenta que Plasmart factura en ARS y que el lead B2B vale
  órdenes de magnitud más que el B2C.
- Respetá el OBJETIVO DEL PERÍODO y la DECISIÓN POR TOMAR del contexto:
  todo el reporte debe orientarse a esa decisión.

FORMATO DE RESPUESTA (markdown):

**Diagnóstico ejecutivo**
1-2 párrafos cortos: qué pasó en el período, lo más relevante.

**Recomendaciones priorizadas**
Entre 4 y 7 recomendaciones, cada una con esta estructura:

**[N]. [Título corto y accionable]**
*Skill:* [nombre del skill principal que respalda esta recomendación]
*Insight:* [evidencia numérica del payload, 1-2 oraciones.]
*Hipótesis:* [por qué está pasando, en términos de marketing.]
→ Acción: [qué hacer concretamente esta semana, paso a paso si aplica.]
→ Cómo medirlo: [qué KPI mover y en cuánto tiempo.]

**Tests sugeridos**
2-3 experimentos A/B concretos derivados del análisis (formato del skill ab-test-setup).

**Riesgos y data faltante**
Bullets cortos sobre qué no se puede concluir con la data disponible
y qué tracking convendría sumar (si aplica).
`.trim();

/**
 * Arma el system prompt completo: instrucciones + contexto editable +
 * skills. focusOverride sobreescribe el campo focus del contexto
 * persistido sin tocarlo (input inline del dashboard).
 *
 * Devuelve el bloque listo para mandar a Anthropic con cache_control.
 */
export async function buildCoreySystemPrompt(
  ctx: AnalysisContext,
  focusOverride?: string,
): Promise<string> {
  const skills = await loadSkillsBlock();
  const accountBlock = renderAccountContext(ctx, focusOverride);
  return [
    BASE_INSTRUCTIONS,
    "",
    "CONTEXTO DE LA CUENTA:",
    accountBlock,
    "",
    "SKILLS DISPONIBLES (frameworks de Corey Haines — coreyhaines31/marketingskills, MIT):",
    "",
    skills,
  ].join("\n");
}

// ---- User content (datos del período) ----

interface BuildCoreyUserContentArgs {
  filters: DashboardFilters;
  kpis: DashboardKpis;
  topCampaigns: CampaignRow[];
  ga4Kpis: Ga4Kpis;
  ga4Top: Ga4SourceMediumRow[];
  comparison: PublisherComparison;
  anomalies: CampaignAnomalies[];
  comparePeriodLabel: string;
}

export function buildCoreyUserContent(args: BuildCoreyUserContentArgs): string {
  const {
    filters,
    kpis,
    topCampaigns,
    ga4Kpis,
    ga4Top,
    comparison,
    anomalies,
    comparePeriodLabel,
  } = args;

  const topSlim = topCampaigns.slice(0, 15).map((c) => ({
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

  const anomaliesSlim = anomalies
    .filter((a) => a.isLearning || a.cpcIncreased || a.isWasteful)
    .map((a) => {
      const camp = topCampaigns.find((c) => c.campaignId === a.campaignId);
      return {
        campaign: camp?.name ?? a.campaignId,
        publisher: camp?.publisher,
        is_learning: a.isLearning,
        cpc_increased_vs_period: a.cpcIncreased,
        wasteful_no_conversions: a.isWasteful,
      };
    });

  const publisherSummary = {
    gads: comparison.gads
      ? {
          cost_ars: round(comparison.gads.cost),
          conversions: round2(comparison.gads.conversions),
          ctr_pct: round2(comparison.gads.ctr * 100),
          cpc_ars: round(comparison.gads.cpc),
          cpa_ars: comparison.gads.conversions > 0 ? round(comparison.gads.cpa) : null,
          spend_share_pct: round2(comparison.gads.spendShare * 100),
          conversion_share_pct: round2(comparison.gads.conversionShare * 100),
        }
      : null,
    meta: comparison.meta
      ? {
          cost_ars: round(comparison.meta.cost),
          conversions: round2(comparison.meta.conversions),
          ctr_pct: round2(comparison.meta.ctr * 100),
          cpc_ars: round(comparison.meta.cpc),
          cpa_ars: comparison.meta.conversions > 0 ? round(comparison.meta.cpa) : null,
          spend_share_pct: round2(comparison.meta.spendShare * 100),
          conversion_share_pct: round2(comparison.meta.conversionShare * 100),
        }
      : null,
  };

  const payload = {
    period: { from: filters.from, to: filters.to },
    compare_against: comparePeriodLabel,
    active_filters: {
      publisher: filters.publisher ?? null,
      campaign_type: filters.type ?? null,
      campaign_id: filters.campaignId ?? null,
    },
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
      by_publisher: publisherSummary,
      top_campaigns_by_cost: topSlim,
      anomalies: anomaliesSlim,
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
    "Aplicá los frameworks de las skills que correspondan y devolvé el reporte siguiendo el formato indicado.",
  ].join("\n");
}

function round(n: number): number {
  return Math.round(n);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
