// Tipo del render_spec — espejo del que consume el worker (worker/remotion/
// types.ts). Vive duplicado a propósito: app y worker se deployan por
// separado. Si cambia uno, actualizar el otro.

export type CropTarget = "panel" | "scene" | "detail" | "auto";
export type BackgroundFill = "blur_extend" | "brand_black" | "brand_cream";
export type MovementType = "push_in" | "pull_out" | "pan" | "static";
export type MovementDirection = "center" | "left" | "right" | "up" | "down";
export type CaptionPosition =
  | "lower_left"
  | "lower_center"
  | "lower_right"
  | "upper_left"
  | "upper_center"
  | "upper_right";

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
    parallax_intensity: number;
    duration_s: number;
  };
  caption: {
    text: string;
    position: CaptionPosition;
    avoid_subject: boolean;
  };
  use_ai_i2v: boolean;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const oneOf = <T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(v as T) ? (v as T) : fallback);

function normRect(input: unknown): Rect {
  if (!Array.isArray(input) || input.length !== 4) return [0, 0, 1, 1];
  let [x, y, w, h] = input.map((n) =>
    typeof n === "number" && Number.isFinite(n) ? n : NaN,
  );
  if ([x, y, w, h].some(Number.isNaN)) return [0, 0, 1, 1];
  x = clamp(x, 0, 1);
  y = clamp(y, 0, 1);
  w = clamp(w, 0.05, 1 - x);
  h = clamp(h, 0.05, 1 - y);
  return [x, y, w, h];
}

/** Valida/clampa el JSON que devuelve Claude antes de persistirlo. */
export function coerceRenderSpec(input: unknown): RenderSpec {
  const raw = (input ?? {}) as Record<string, any>;
  const crop = (raw.crop ?? {}) as Record<string, any>;
  const movement = (raw.movement ?? {}) as Record<string, any>;
  const caption = (raw.caption ?? {}) as Record<string, any>;
  return {
    crop: {
      target: oneOf(crop.target, ["panel", "scene", "detail", "auto"], "auto"),
      rect_9x16: normRect(crop.rect_9x16),
      background_fill: oneOf(
        crop.background_fill,
        ["blur_extend", "brand_black", "brand_cream"],
        "blur_extend",
      ),
    },
    movement: {
      type: oneOf(
        movement.type,
        ["push_in", "pull_out", "pan", "static"],
        "push_in",
      ),
      direction: oneOf(
        movement.direction,
        ["center", "left", "right", "up", "down"],
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
        ],
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
