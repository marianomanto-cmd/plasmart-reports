// Formateo de números en es-AR.
// Lineamiento del doc: cifras sin abreviar (mostrar 1.234.567 antes que 1.2M).

const nfInt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

const nfCurrency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const nfPct1 = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const nfPct2 = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nfDecimal = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234567 → "1.234.567" */
export function formatInteger(n: number): string {
  return nfInt.format(Math.round(n));
}

/** 1234567 → "$ 1.234.567" */
export function formatCurrencyArs(n: number): string {
  return nfCurrency.format(n);
}

/** 1234.5 → "1.234,50" */
export function formatDecimal(n: number): string {
  return nfDecimal.format(n);
}

/** 0.0234 → "2,3%" (recibe ratio 0..1) */
export function formatRatioAsPct(ratio: number): string {
  return `${nfPct1.format(ratio * 100)}%`;
}

/** 12.5 → "+12,5%" / -3.2 → "−3,2%" / null → "—" */
export function formatDeltaPct(deltaPct: number | null): string {
  if (deltaPct === null) return "—";
  const sign = deltaPct >= 0 ? "+" : "−";
  return `${sign}${nfPct2.format(Math.abs(deltaPct))}%`;
}
