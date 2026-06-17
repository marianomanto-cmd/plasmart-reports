import { describe, expect, it } from "vitest";
import {
  formatCurrencyArs,
  formatDecimal,
  formatDeltaPct,
  formatInteger,
  formatRatioAsPct,
} from "@/lib/format";

// Intl mete espacios no-rompibles (NBSP / narrow NBSP) entre símbolo y
// número. Los normalizamos a un espacio común para que las aserciones no
// sean frágiles según la versión de ICU.
const norm = (s: string) => s.replace(/[  ]/g, " ");

describe("formatInteger", () => {
  it("agrupa miles con punto (es-AR) y redondea", () => {
    expect(formatInteger(1234567)).toBe("1.234.567");
    expect(formatInteger(999.6)).toBe("1.000");
    expect(formatInteger(0)).toBe("0");
  });
});

describe("formatCurrencyArs", () => {
  it("formatea ARS sin decimales", () => {
    expect(norm(formatCurrencyArs(1234567))).toBe("$ 1.234.567");
  });

  it("maneja el cero", () => {
    expect(norm(formatCurrencyArs(0))).toBe("$ 0");
  });
});

describe("formatDecimal", () => {
  it("usa coma decimal y dos dígitos", () => {
    expect(formatDecimal(1234.5)).toBe("1.234,50");
  });
});

describe("formatRatioAsPct", () => {
  it("convierte un ratio 0..1 a porcentaje con un decimal", () => {
    expect(formatRatioAsPct(0.0234)).toBe("2,3%");
    expect(formatRatioAsPct(1)).toBe("100,0%");
  });
});

describe("formatDeltaPct", () => {
  it("prefija con + los positivos", () => {
    expect(formatDeltaPct(12.5)).toBe("+12,50%");
  });

  it("prefija con − (U+2212) los negativos", () => {
    expect(formatDeltaPct(-3.2)).toBe("−3,20%");
  });

  it("muestra em dash cuando el delta es null", () => {
    expect(formatDeltaPct(null)).toBe("—");
  });

  it("trata el cero como positivo", () => {
    expect(formatDeltaPct(0)).toBe("+0,00%");
  });
});
