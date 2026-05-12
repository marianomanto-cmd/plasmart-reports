// Tremor getYAxisDomain [v0.0.0]
// Fuente: tremorlabs/tremor — src/utils/getYAxisDomain.ts (copy-paste textual).

export const getYAxisDomain = (
  autoMinValue: boolean,
  minValue: number | undefined,
  maxValue: number | undefined,
) => {
  const minDomain = autoMinValue ? "auto" : (minValue ?? 0);
  const maxDomain = maxValue ?? "auto";
  return [minDomain, maxDomain];
};
