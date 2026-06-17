import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSearchString, parseFilters } from "@/lib/filters";
import { defaultRange } from "@/lib/dates";
import type { DashboardFilters } from "@/lib/types";

const FROZEN_NOW = "2026-06-17T10:30:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FROZEN_NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseFilters", () => {
  it("cae al rango por defecto cuando no hay params", () => {
    const f = parseFilters({});
    expect(f.from).toBe(defaultRange().from);
    expect(f.to).toBe(defaultRange().to);
    expect(f.compare).toBe("previous");
    expect(f.publisher).toBeUndefined();
    expect(f.type).toBeUndefined();
    expect(f.campaignId).toBeUndefined();
    expect(f.granularity).toBeUndefined();
  });

  it("respeta valores válidos", () => {
    const f = parseFilters({
      from: "2026-01-01",
      to: "2026-01-31",
      compare: "yoy",
      publisher: "gads",
      type: "search",
      campaign: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      granularity: "adset",
    });
    expect(f).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
      compare: "yoy",
      publisher: "gads",
      type: "search",
      campaignId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      granularity: "adset",
    });
  });

  it("descarta fechas inválidas y usa el default", () => {
    const f = parseFilters({ from: "garbage", to: "2026-99-99" });
    expect(f.from).toBe(defaultRange().from);
    expect(f.to).toBe(defaultRange().to);
  });

  it("repara from > to cayendo al default", () => {
    const f = parseFilters({ from: "2026-05-01", to: "2026-01-01" });
    expect(f.from).toBe(defaultRange().from);
    expect(f.to).toBe(defaultRange().to);
  });

  it("invalida un compare desconocido a 'previous'", () => {
    expect(parseFilters({ compare: "weekly" }).compare).toBe("previous");
  });

  it("ignora un publisher fuera del enum", () => {
    expect(parseFilters({ publisher: "tiktok" }).publisher).toBeUndefined();
  });

  it("ignora un type demasiado largo (posible inyección)", () => {
    const long = "x".repeat(64);
    expect(parseFilters({ type: long }).type).toBeUndefined();
  });

  it("ignora un campaign id que no parece uuid", () => {
    expect(parseFilters({ campaign: "'; DROP TABLE--" }).campaignId).toBeUndefined();
  });

  it("ignora una granularidad inválida", () => {
    expect(parseFilters({ granularity: "keyword" }).granularity).toBeUndefined();
  });

  it("toma el primer valor cuando el param viene repetido (array)", () => {
    expect(parseFilters({ publisher: ["meta", "gads"] }).publisher).toBe("meta");
  });
});

describe("buildSearchString", () => {
  it("serializa from y to siempre", () => {
    const qs = buildSearchString({ from: "2026-01-01", to: "2026-01-31" });
    const params = new URLSearchParams(qs);
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-01-31");
  });

  it("omite compare=previous y granularity=campaign (defaults) para acortar la URL", () => {
    const qs = buildSearchString({
      from: "2026-01-01",
      to: "2026-01-31",
      compare: "previous",
      granularity: "campaign",
    });
    expect(qs).not.toContain("compare");
    expect(qs).not.toContain("granularity");
  });

  it("serializa compare y granularity no-default", () => {
    const qs = buildSearchString({ compare: "yoy", granularity: "ad" });
    const params = new URLSearchParams(qs);
    expect(params.get("compare")).toBe("yoy");
    expect(params.get("granularity")).toBe("ad");
  });

  it("usa la clave 'campaign' para campaignId", () => {
    const qs = buildSearchString({ campaignId: "uuid-123" });
    expect(new URLSearchParams(qs).get("campaign")).toBe("uuid-123");
  });

  it("hace round-trip con parseFilters", () => {
    const original: DashboardFilters = {
      from: "2026-03-01",
      to: "2026-03-31",
      compare: "yoy",
      publisher: "meta",
      type: "leads",
      campaignId: "a1b2c3d4e5f67890abcdef1234567890",
      granularity: "ad",
    };
    const reparsed = parseFilters(
      Object.fromEntries(new URLSearchParams(buildSearchString(original))),
    );
    expect(reparsed).toEqual(original);
  });
});
