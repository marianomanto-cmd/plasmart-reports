// Pilares de contenido (sección 3 de la spec) + calendario rotativo.
// El `key` matchea el enum content_subject en la DB.

export type PillarKey =
  | "panel_contexto"
  | "calado_detalle"
  | "luz_sombra"
  | "proceso"
  | "material";

export interface Pillar {
  key: PillarKey;
  label: string;
  description: string;
  weight: number; // frecuencia objetivo (suma 100)
}

export const PILLARS: Pillar[] = [
  {
    key: "panel_contexto",
    label: "Panel en contexto",
    description:
      "La celosía instalada en su aplicación (portón, cerco, baranda, pérgola, fachada). El 'imaginate esto en tu espacio'.",
    weight: 35,
  },
  {
    key: "calado_detalle",
    label: "El diseño / el calado",
    description:
      "El patrón en detalle y la variedad de motivos (orgánicos, geométricos, abstractos). Hero del diseño.",
    weight: 25,
  },
  {
    key: "luz_sombra",
    label: "Luz y sombra",
    description:
      "El juego de la sombra del calado proyectada sobre pared, piso o agua. Alto valor visual.",
    weight: 15,
  },
  {
    key: "proceso",
    label: "Proceso / máquina",
    description: "El láser cortando el panel. El 'cómo'.",
    weight: 15,
  },
  {
    key: "material",
    label: "Posibilidades / a medida",
    description:
      "Terminaciones (corten, blanco, negro), materiales, diseño personalizado. Educativo y comercial.",
    weight: 10,
  },
];

export const PILLAR_BY_KEY: Record<PillarKey, Pillar> = Object.fromEntries(
  PILLARS.map((p) => [p.key, p]),
) as Record<PillarKey, Pillar>;

export function isPillarKey(v: unknown): v is PillarKey {
  return typeof v === "string" && v in PILLAR_BY_KEY;
}

/**
 * Elige el pilar de hoy: muestreo ponderado por `weight`, excluyendo el
 * último publicado (regla: no repetir el mismo pilar dos días seguidos).
 *
 * @param lastPillar  el pilar del post más reciente (para no repetir).
 * @param rng         inyectable para tests; default Math.random.
 */
export function pickPillar(
  lastPillar?: PillarKey | null,
  rng: () => number = Math.random,
): PillarKey {
  const pool = PILLARS.filter((p) => p.key !== lastPillar);
  const candidates = pool.length > 0 ? pool : PILLARS;
  const total = candidates.reduce((sum, p) => sum + p.weight, 0);
  let r = rng() * total;
  for (const p of candidates) {
    r -= p.weight;
    if (r <= 0) return p.key;
  }
  return candidates[candidates.length - 1].key;
}
