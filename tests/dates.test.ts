import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DATE_RANGE_PRESETS,
  comparisonRange,
  compareModeLabel,
  defaultRange,
  isValidIsoDate,
  matchDatePreset,
  parseIsoDate,
  rangeDays,
  toIsoDate,
  todayIso,
} from "@/lib/dates";

// Congelamos el reloj para todos los tests que dependen de "hoy".
// 17-jun-2026 10:30 UTC: un miércoles cualquiera, mes con 30 días,
// mes anterior (mayo) con 31.
const FROZEN_NOW = "2026-06-17T10:30:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FROZEN_NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toIsoDate / parseIsoDate", () => {
  it("serializa una fecha UTC a YYYY-MM-DD", () => {
    expect(toIsoDate(new Date("2026-06-17T23:59:59Z"))).toBe("2026-06-17");
  });

  it("parsea YYYY-MM-DD como medianoche UTC (round-trip)", () => {
    const iso = "2026-02-28";
    expect(toIsoDate(parseIsoDate(iso))).toBe(iso);
  });
});

describe("isValidIsoDate", () => {
  it("acepta fechas ISO válidas", () => {
    expect(isValidIsoDate("2026-06-17")).toBe(true);
    expect(isValidIsoDate("2000-01-01")).toBe(true);
  });

  it("rechaza formato incorrecto", () => {
    expect(isValidIsoDate("17/06/2026")).toBe(false);
    expect(isValidIsoDate("2026-6-7")).toBe(false);
    expect(isValidIsoDate("not-a-date")).toBe(false);
  });

  it("rechaza fechas calendario imposibles", () => {
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
  });

  it("rechaza no-strings", () => {
    expect(isValidIsoDate(20260617)).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
  });
});

describe("todayIso", () => {
  it("devuelve la fecha UTC de hoy", () => {
    expect(todayIso()).toBe("2026-06-17");
  });
});

describe("defaultRange", () => {
  it("son los últimos 30 días incluyendo hoy", () => {
    expect(defaultRange()).toEqual({ from: "2026-05-19", to: "2026-06-17" });
    expect(rangeDays("2026-05-19", "2026-06-17")).toBe(30);
  });
});

describe("rangeDays", () => {
  it("es inclusivo en ambos extremos", () => {
    expect(rangeDays("2026-06-17", "2026-06-17")).toBe(1);
    expect(rangeDays("2026-06-01", "2026-06-30")).toBe(30);
  });

  it("cuenta correctamente cruzando un cambio de año", () => {
    expect(rangeDays("2025-12-31", "2026-01-01")).toBe(2);
  });
});

describe("comparisonRange", () => {
  it("previous: mismo largo inmediatamente anterior", () => {
    expect(comparisonRange("2026-04-01", "2026-04-30", "previous")).toEqual({
      from: "2026-03-02",
      to: "2026-03-31",
    });
  });

  it("previous: rango de un solo día", () => {
    expect(comparisonRange("2026-06-17", "2026-06-17", "previous")).toEqual({
      from: "2026-06-16",
      to: "2026-06-16",
    });
  });

  it("yoy: mismo rango exacto del año anterior", () => {
    expect(comparisonRange("2026-04-01", "2026-04-30", "yoy")).toEqual({
      from: "2025-04-01",
      to: "2025-04-30",
    });
  });

  it("none: devuelve null (no hay segunda query)", () => {
    expect(comparisonRange("2026-04-01", "2026-04-30", "none")).toBeNull();
  });
});

describe("DATE_RANGE_PRESETS", () => {
  it("todos terminan hoy salvo 'mes pasado'", () => {
    for (const preset of DATE_RANGE_PRESETS) {
      const { to } = preset.range();
      if (preset.key === "lastMonth") {
        expect(to).toBe("2026-05-31");
      } else {
        expect(to).toBe("2026-06-17");
      }
    }
  });

  it("últimos N días incluyen hoy", () => {
    const last7 = DATE_RANGE_PRESETS.find((p) => p.key === "last7")!.range();
    expect(last7).toEqual({ from: "2026-06-11", to: "2026-06-17" });
    expect(rangeDays(last7.from, last7.to)).toBe(7);

    const last30 = DATE_RANGE_PRESETS.find((p) => p.key === "last30")!.range();
    expect(rangeDays(last30.from, last30.to)).toBe(30);
  });

  it("este mes arranca el día 1", () => {
    expect(
      DATE_RANGE_PRESETS.find((p) => p.key === "thisMonth")!.range(),
    ).toEqual({ from: "2026-06-01", to: "2026-06-17" });
  });

  it("mes pasado cubre el mes calendario completo", () => {
    expect(
      DATE_RANGE_PRESETS.find((p) => p.key === "lastMonth")!.range(),
    ).toEqual({ from: "2026-05-01", to: "2026-05-31" });
  });

  it("este año arranca el 1 de enero", () => {
    expect(
      DATE_RANGE_PRESETS.find((p) => p.key === "thisYear")!.range(),
    ).toEqual({ from: "2026-01-01", to: "2026-06-17" });
  });
});

describe("matchDatePreset", () => {
  it("matchea el rango por defecto con 'últimos 30 días'", () => {
    const def = defaultRange();
    expect(matchDatePreset(def.from, def.to)).toBe("last30");
  });

  it("matchea 'hoy'", () => {
    expect(matchDatePreset("2026-06-17", "2026-06-17")).toBe("today");
  });

  it("devuelve null para un rango custom", () => {
    expect(matchDatePreset("2026-03-03", "2026-04-09")).toBeNull();
  });
});

describe("compareModeLabel", () => {
  it("traduce cada modo", () => {
    expect(compareModeLabel("previous")).toBe("período anterior");
    expect(compareModeLabel("yoy")).toBe("año anterior");
    expect(compareModeLabel("none")).toBe("sin comparación");
  });
});
