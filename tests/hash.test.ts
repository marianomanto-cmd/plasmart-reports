import { describe, expect, it } from "vitest";
import { hashFilters } from "@/lib/ai/hash";
import type { DashboardFilters } from "@/lib/types";

const base: DashboardFilters = {
  from: "2026-01-01",
  to: "2026-01-31",
  compare: "previous",
  publisher: "gads",
  type: "search",
  campaignId: "abc",
};

describe("hashFilters", () => {
  it("es determinístico: mismos filtros → mismo hash", () => {
    expect(hashFilters(base)).toBe(hashFilters({ ...base }));
  });

  it("devuelve 32 hex chars", () => {
    expect(hashFilters(base)).toMatch(/^[0-9a-f]{32}$/);
  });

  it("cambia si cambia cualquier filtro relevante", () => {
    expect(hashFilters({ ...base, to: "2026-02-01" })).not.toBe(hashFilters(base));
    expect(hashFilters({ ...base, publisher: "meta" })).not.toBe(hashFilters(base));
    expect(hashFilters({ ...base, compare: "yoy" })).not.toBe(hashFilters(base));
  });

  it("ignora la granularidad (no es parte de la clave de cache de IA)", () => {
    expect(hashFilters({ ...base, granularity: "ad" })).toBe(hashFilters(base));
  });

  it("el namespace 'default' no cambia el hash (compatibilidad hacia atrás)", () => {
    expect(hashFilters(base, "default")).toBe(hashFilters(base));
  });

  it("un namespace distinto cambia el hash", () => {
    expect(hashFilters(base, "corey")).not.toBe(hashFilters(base));
  });

  it("el contextKey cambia el hash (invalida cache al editar contexto)", () => {
    expect(hashFilters(base, "default", "v2")).not.toBe(
      hashFilters(base, "default", "v1"),
    );
  });
});
