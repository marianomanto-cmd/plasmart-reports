// El `render_spec` es la decisión completa del director de arte (Claude).
// El worker lo ejecuta al pie de la letra: NO toma decisiones de diseño.
// Estos tipos + el normalizador son el borde de confianza: el spec llega
// como JSON desde la nube, así que se valida/clampa antes de renderizar.

export type CropTarget = "panel" | "scene" | "detail" | "auto";
export type BackgroundFill = "blur_extend" | "brand_black" | "brand_cream";
export type MovementType = "push_in" | "pull_out" | "pan" | "static";
export type MovementDirection =
  | "center"
  | "left"
  | "right"
  | "up"
  | "down";
export type CaptionPosition =
  | "lower_left"
  | "lower_center"
  | "lower_right"
  | "upper_left"
  | "upper_center"
  | "upper_right";

/** [x, y, w, h] en fracciones (0..1) de la imagen fuente. */
export type Rect = [number, number, number, number];

export interface RenderSpec {
  crop: {
    target: CropTarget;
    rect_9x16: Rect;
    background_fill: BackgroundFill;
  };
  movement: {
    type: MovementType;
    direction: MovementDirection;
    parallax_intensity: number; // 0..1
    duration_s: number; // segundos (se clampa a 8..18)
  };
  caption: {
    text: string;
    position: CaptionPosition;
    avoid_subject: boolean;
  };
  use_ai_i2v: boolean;
}

export const DEFAULT_SPEC: RenderSpec = {
  crop: {
    target: "auto",
    rect_9x16: [0, 0, 1, 1],
    background_fill: "blur_extend",
  },
  movement: {
    type: "push_in",
    direction: "center",
    parallax_intensity: 0.5,
    duration_s: 12,
  },
  caption: {
    text: "",
    position: "lower_left",
    avoid_subject: true,
  },
  use_ai_i2v: false,
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const oneOf = <T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(v as T) ? (v as T) : fallback);

function normalizeRect(input: unknown): Rect {
  if (!Array.isArray(input) || input.length !== 4) {
    return [...DEFAULT_SPEC.crop.rect_9x16];
  }
  let [x, y, w, h] = input.map((n) =>
    typeof n === "number" && Number.isFinite(n) ? n : NaN,
  );
  if ([x, y, w, h].some(Number.isNaN)) return [...DEFAULT_SPEC.crop.rect_9x16];
  x = clamp(x, 0, 1);
  y = clamp(y, 0, 1);
  w = clamp(w, 0.05, 1 - x); // ancho mínimo razonable, sin desbordar
  h = clamp(h, 0.05, 1 - y);
  return [x, y, w, h];
}

/**
 * Normaliza un render_spec arbitrario a uno válido y completo, rellenando
 * defaults y clampeando rangos. Nunca tira: ante basura, cae al default.
 */
export function normalizeRenderSpec(input: unknown): RenderSpec {
  const raw = (input ?? {}) as Record<string, any>;
  const crop = (raw.crop ?? {}) as Record<string, any>;
  const movement = (raw.movement ?? {}) as Record<string, any>;
  const caption = (raw.caption ?? {}) as Record<string, any>;

  return {
    crop: {
      target: oneOf(
        crop.target,
        ["panel", "scene", "detail", "auto"] as const,
        "auto",
      ),
      rect_9x16: normalizeRect(crop.rect_9x16),
      background_fill: oneOf(
        crop.background_fill,
        ["blur_extend", "brand_black", "brand_cream"] as const,
        "blur_extend",
      ),
    },
    movement: {
      type: oneOf(
        movement.type,
        ["push_in", "pull_out", "pan", "static"] as const,
        "push_in",
      ),
      direction: oneOf(
        movement.direction,
        ["center", "left", "right", "up", "down"] as const,
        "center",
      ),
      parallax_intensity:
        typeof movement.parallax_intensity === "number"
          ? clamp(movement.parallax_intensity, 0, 1)
          : 0.5,
      duration_s:
        typeof movement.duration_s === "number"
          ? clamp(movement.duration_s, 8, 18)
          : 12,
    },
    caption: {
      text: typeof caption.text === "string" ? caption.text : "",
      position: oneOf(
        caption.position,
        [
          "lower_left",
          "lower_center",
          "lower_right",
          "upper_left",
          "upper_center",
          "upper_right",
        ] as const,
        "lower_left",
      ),
      avoid_subject:
        typeof caption.avoid_subject === "boolean"
          ? caption.avoid_subject
          : true,
    },
    use_ai_i2v: raw.use_ai_i2v === true,
  };
}

/** Centro del recorte como string objectPosition CSS ("x% y%"). */
export function cropCenterPercent(rect: Rect): string {
  const [x, y, w, h] = rect;
  const cx = (x + w / 2) * 100;
  const cy = (y + h / 2) * 100;
  return `${cx.toFixed(2)}% ${cy.toFixed(2)}%`;
}
