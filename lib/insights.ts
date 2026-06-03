// Capa de "insights": deriva señales accionables de los datos que ya
// calculamos (filas de campaña + anomalías) para el cockpit /dashboard.
// No hace queries: transforma lo que las queries ya trajeron.

import type {
  CampaignAnomalies,
  CampaignRow,
  DashboardKpis,
  Publisher,
} from "@/lib/types";
import { formatCurrencyArs, formatRatioAsPct } from "@/lib/format";

export type AlertSeverity = "danger" | "warn" | "info";

export interface CockpitAlert {
  id: string;
  severity: AlertSeverity;
  tag: string;
  title: string;
  meta: string;
  body: string;
  action: string;
}

const publisherLabel = (p: Publisher) =>
  p === "gads" ? "Google Ads" : "Meta Ads";

const typeLabel = (t: string) => t.replace(/_/g, " ").toUpperCase();

/**
 * Construye el feed "Qué mirar" a partir de las anomalías por campaña.
 * Una card por campaña, con la señal más severa (desperdicio > CPC > aprendizaje).
 * Ordena por severidad y, dentro de cada nivel, por inversión desc.
 */
export function buildAlerts(
  rows: CampaignRow[],
  anomalies: Map<string, CampaignAnomalies>,
  limit = 5,
): CockpitAlert[] {
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalConv = rows.reduce((s, r) => s + r.conversions, 0);

  const alerts: Array<CockpitAlert & { _cost: number; _rank: number }> = [];

  for (const row of rows) {
    const a = anomalies.get(row.campaignId);
    if (!a) continue;

    const meta = `${publisherLabel(row.publisher)} · ${typeLabel(row.type)}`;
    const spendShare = totalCost > 0 ? row.cost / totalCost : 0;
    const convShare = totalConv > 0 ? row.conversions / totalConv : 0;

    if (a.isWasteful) {
      alerts.push({
        _cost: row.cost,
        _rank: 0,
        id: `${row.campaignId}-waste`,
        severity: "danger",
        tag: "Desperdicio",
        title: row.name,
        meta,
        body: `Consumió el ${formatRatioAsPct(spendShare)} del gasto (${formatCurrencyArs(
          row.cost,
        )}) y trajo el ${formatRatioAsPct(convShare)} de las consultas.${
          row.conversions > 0 ? ` CPA ${formatCurrencyArs(row.cpa)}.` : " Sin consultas."
        }`,
        action: "Revisar términos / negativas, o recortar presupuesto.",
      });
    } else if (a.cpcIncreased) {
      alerts.push({
        _cost: row.cost,
        _rank: 1,
        id: `${row.campaignId}-cpc`,
        severity: "warn",
        tag: "CPC ↑",
        title: row.name,
        meta,
        body: `El CPC subió más del 50% vs el período de comparación (hoy ${formatCurrencyArs(
          row.cpc,
        )}), sin mejora proporcional en consultas.`,
        action: "Revisar pujas / señales de audiencia.",
      });
    } else if (a.isLearning) {
      alerts.push({
        _cost: row.cost,
        _rank: 2,
        id: `${row.campaignId}-learn`,
        severity: "info",
        tag: "En aprendizaje",
        title: row.name,
        meta,
        body: "Con datos de hace menos de 7 días: los KPIs todavía son inestables.",
        action: "Esperar a que estabilice antes de juzgar.",
      });
    }
  }

  alerts.sort((x, y) => x._rank - y._rank || y._cost - x._cost);
  return alerts.slice(0, limit).map(({ _cost, _rank, ...rest }) => {
    void _cost;
    void _rank;
    return rest;
  });
}

// ---- Distribución de gasto ----

export interface SpendSlice {
  id: string;
  name: string;
  publisher: Publisher;
  cost: number;
  share: number; // 0..1 sobre el total
  wasteful: boolean;
}

/**
 * Top-N campañas por inversión, con su share del gasto total.
 * Marca las que son "desperdicio" para teñirlas en rojo.
 */
export function buildSpendDistribution(
  rows: CampaignRow[],
  anomalies: Map<string, CampaignAnomalies>,
  limit = 6,
): { slices: SpendSlice[]; rest: number; total: number } {
  const total = rows.reduce((s, r) => s + r.cost, 0);
  const sorted = [...rows].sort((a, b) => b.cost - a.cost);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((s, r) => s + r.cost, 0);

  return {
    total,
    rest,
    slices: top.map((r) => ({
      id: r.campaignId,
      name: r.name,
      publisher: r.publisher,
      cost: r.cost,
      share: total > 0 ? r.cost / total : 0,
      wasteful: anomalies.get(r.campaignId)?.isWasteful ?? false,
    })),
  };
}

// ---- Embudo ----

export interface FunnelStage {
  label: string;
  value: number;
  /** Tasa de conversión desde la etapa anterior (0..1). null en la primera. */
  rate: number | null;
  rateLabel: string | null;
}

export function buildFunnel(kpis: DashboardKpis): FunnelStage[] {
  const impr = kpis.impressions.current;
  const clicks = kpis.clicks.current;
  const conv = kpis.conversions.current;

  return [
    { label: "Impresiones", value: impr, rate: null, rateLabel: null },
    {
      label: "Clics",
      value: clicks,
      rate: impr > 0 ? clicks / impr : null,
      rateLabel: "CTR",
    },
    {
      label: "Consultas",
      value: conv,
      rate: clicks > 0 ? conv / clicks : null,
      rateLabel: "Tasa de consulta",
    },
  ];
}

// ---- Eficiencia (CPA vs volumen) ----

export interface EfficiencyPoint {
  id: string;
  name: string;
  publisher: Publisher;
  conversions: number;
  cost: number;
  /** CPA en ARS; null si la campaña no tuvo conversiones. */
  cpa: number | null;
}

/**
 * Puntos para el scatter de eficiencia. Sólo campañas con gasto.
 * Las que no tuvieron conversiones quedan con cpa=null (peor cuadrante).
 */
export function buildEfficiencyPoints(rows: CampaignRow[]): EfficiencyPoint[] {
  return rows
    .filter((r) => r.cost > 0)
    .map((r) => ({
      id: r.campaignId,
      name: r.name,
      publisher: r.publisher,
      conversions: r.conversions,
      cost: r.cost,
      cpa: r.conversions > 0 ? r.cpa : null,
    }));
}
