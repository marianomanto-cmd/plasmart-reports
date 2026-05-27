// Tokens de marca del VIDEO (no confundir con la paleta del dashboard).
// Quedan hardcodeados acá para garantizar consistencia de marca por
// construcción: la IA arma cada video con estos ladrillos, no elige colores.

export const BRAND = {
  black: "#1A1A1A",
  copper: "#C9A961",
  cream: "#F5F5F0",
  // Inter va por fallback de sistema; si la PC no la tiene, cae a un
  // sans-serif neutro. (Mejora futura: @remotion/google-fonts.)
  fontFamily:
    'Inter, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif',
} as const;

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;
