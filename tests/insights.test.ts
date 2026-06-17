import { describe, expect, it } from "vitest";
import {
  buildAlerts,
  buildEfficiencyPoints,
  buildFunnel,
  buildSpendDistribution,
} from "@/lib/insights";
import type {
  CampaignAnomalies,
  CampaignRow,
  DashboardKpis,
} from "@/lib/types";

function makeRow(partial: Partial<CampaignRow> & { campaignId: string }): CampaignRow {
  return {
    name: partial.name ?? `Campaña ${partial.campaignId}`,
    publisher: partial.publisher ?? "gads",
    type: partial.type ?? "search",
    cost: partial.cost ?? 0,
    impressions: partial.impressions ?? 0,
    clicks: partial.clicks ?? 0,
    conversions: partial.conversions ?? 0,
    ctr: partial.ctr ?? 0,
    cpc: partial.cpc ?? 0,
    cpa: partial.cpa ?? 0,
    ...partial,
  };
}

function anomaly(
  campaignId: string,
  flags: Partial<Omit<CampaignAnomalies, "campaignId">>,
): CampaignAnomalies {
  return {
    campaignId,
    isLearning: flags.isLearning ?? false,
    cpcIncreased: flags.cpcIncreased ?? false,
    isWasteful: flags.isWasteful ?? false,
  };
}

describe("buildAlerts", () => {
  it("ignora campañas sin entrada de anomalía", () => {
    const rows = [makeRow({ campaignId: "a", cost: 100 })];
    expect(buildAlerts(rows, new Map())).toEqual([]);
  });

  it("ordena por severidad: desperdicio > CPC > aprendizaje", () => {
    const rows = [
      makeRow({ campaignId: "learn", cost: 10 }),
      makeRow({ campaignId: "cpc", cost: 10 }),
      makeRow({ campaignId: "waste", cost: 10, conversions: 0 }),
    ];
    const anomalies = new Map<string, CampaignAnomalies>([
      ["learn", anomaly("learn", { isLearning: true })],
      ["cpc", anomaly("cpc", { cpcIncreased: true })],
      ["waste", anomaly("waste", { isWasteful: true })],
    ]);
    const alerts = buildAlerts(rows, anomalies);
    expect(alerts.map((a) => a.severity)).toEqual(["danger", "warn", "info"]);
  });

  it("dentro de la misma severidad ordena por inversión desc", () => {
    const rows = [
      makeRow({ campaignId: "small", cost: 50 }),
      makeRow({ campaignId: "big", cost: 500 }),
    ];
    const anomalies = new Map<string, CampaignAnomalies>([
      ["small", anomaly("small", { isWasteful: true })],
      ["big", anomaly("big", { isWasteful: true })],
    ]);
    const alerts = buildAlerts(rows, anomalies);
    expect(alerts.map((a) => a.title)).toEqual([
      "Campaña big",
      "Campaña small",
    ]);
  });

  it("respeta el límite", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeRow({ campaignId: `c${i}`, cost: i }),
    );
    const anomalies = new Map(
      rows.map((r) => [r.campaignId, anomaly(r.campaignId, { isWasteful: true })]),
    );
    expect(buildAlerts(rows, anomalies, 3)).toHaveLength(3);
  });

  it("la señal más severa gana cuando hay varias en la misma campaña", () => {
    const rows = [makeRow({ campaignId: "multi", cost: 100 })];
    const anomalies = new Map<string, CampaignAnomalies>([
      ["multi", anomaly("multi", { isWasteful: true, cpcIncreased: true, isLearning: true })],
    ]);
    const alerts = buildAlerts(rows, anomalies);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("danger");
  });

  it("no expone los campos privados de orden (_cost, _rank)", () => {
    const rows = [makeRow({ campaignId: "a", cost: 100 })];
    const anomalies = new Map<string, CampaignAnomalies>([
      ["a", anomaly("a", { isLearning: true })],
    ]);
    const [alert] = buildAlerts(rows, anomalies);
    expect(alert).not.toHaveProperty("_cost");
    expect(alert).not.toHaveProperty("_rank");
  });
});

describe("buildSpendDistribution", () => {
  it("calcula shares sobre el total y agrupa el resto", () => {
    const rows = [
      makeRow({ campaignId: "a", cost: 600 }),
      makeRow({ campaignId: "b", cost: 300 }),
      makeRow({ campaignId: "c", cost: 100 }),
    ];
    const dist = buildSpendDistribution(rows, new Map(), 2);
    expect(dist.total).toBe(1000);
    expect(dist.rest).toBe(100);
    expect(dist.slices).toHaveLength(2);
    expect(dist.slices[0]).toMatchObject({ id: "a", share: 0.6 });
    expect(dist.slices[1]).toMatchObject({ id: "b", share: 0.3 });
  });

  it("no divide por cero si no hay gasto", () => {
    const rows = [makeRow({ campaignId: "a", cost: 0 })];
    const dist = buildSpendDistribution(rows, new Map());
    expect(dist.total).toBe(0);
    expect(dist.slices[0].share).toBe(0);
  });

  it("marca como wasteful según las anomalías", () => {
    const rows = [makeRow({ campaignId: "a", cost: 100 })];
    const anomalies = new Map<string, CampaignAnomalies>([
      ["a", anomaly("a", { isWasteful: true })],
    ]);
    expect(buildSpendDistribution(rows, anomalies).slices[0].wasteful).toBe(true);
  });
});

describe("buildFunnel", () => {
  const kpis = (impr: number, clicks: number, conv: number): DashboardKpis => ({
    cost: { current: 0, previous: null, deltaPct: null },
    impressions: { current: impr, previous: null, deltaPct: null },
    clicks: { current: clicks, previous: null, deltaPct: null },
    conversions: { current: conv, previous: null, deltaPct: null },
  });

  it("calcula las tasas entre etapas", () => {
    const funnel = buildFunnel(kpis(1000, 50, 5));
    expect(funnel).toHaveLength(3);
    expect(funnel[0]).toMatchObject({ label: "Impresiones", rate: null });
    expect(funnel[1].rate).toBeCloseTo(0.05);
    expect(funnel[2].rate).toBeCloseTo(0.1);
  });

  it("evita NaN cuando una etapa previa es cero", () => {
    const funnel = buildFunnel(kpis(0, 0, 0));
    expect(funnel[1].rate).toBeNull();
    expect(funnel[2].rate).toBeNull();
  });
});

describe("buildEfficiencyPoints", () => {
  it("descarta campañas sin gasto", () => {
    const rows = [
      makeRow({ campaignId: "spent", cost: 100, conversions: 2, cpa: 50 }),
      makeRow({ campaignId: "free", cost: 0 }),
    ];
    const points = buildEfficiencyPoints(rows);
    expect(points).toHaveLength(1);
    expect(points[0].id).toBe("spent");
  });

  it("deja cpa=null cuando no hubo conversiones", () => {
    const rows = [makeRow({ campaignId: "a", cost: 100, conversions: 0, cpa: 0 })];
    expect(buildEfficiencyPoints(rows)[0].cpa).toBeNull();
  });
});
