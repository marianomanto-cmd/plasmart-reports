import { interpolate, Easing } from "remotion";
import type { RenderSpec } from "./types";

// Matemática de movimiento de los ladrillos. Pura y testeable: dado el
// movimiento del spec + el frame actual, devuelve los transforms CSS de
// cada capa. La sensación 2.5D nace de que la capa foreground (enmascarada
// por el depth map) se mueve/escala MÁS que la background.

export interface LayerTransforms {
  /** Capa de relleno (imagen muy borrosa de fondo): drift sutil. */
  fill: string;
  /** Capa principal (imagen "cover"). */
  background: string;
  /** Capa foreground enmascarada por profundidad (el parallax). */
  foreground: string;
}

const easeInOut = Easing.inOut(Easing.ease);

// Vector de dirección del paneo. left = la cámara va hacia la izquierda.
function directionVector(dir: RenderSpec["movement"]["direction"]): [number, number] {
  switch (dir) {
    case "left":
      return [-1, 0];
    case "right":
      return [1, 0];
    case "up":
      return [0, -1];
    case "down":
      return [0, 1];
    default:
      return [0, 0];
  }
}

const MAX_PAN_PX = 70; // recorrido máx del paneo de la capa principal
const MAX_PARALLAX_PX = 90; // recorrido extra del foreground a intensidad 1

export function computeMotion(
  movement: RenderSpec["movement"],
  frame: number,
  durationInFrames: number,
): LayerTransforms {
  const p = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });

  // Escala base de la capa principal según el tipo de movimiento.
  let scaleBg: number;
  let pan: number; // 0..1 progreso de paneo aplicado
  switch (movement.type) {
    case "push_in":
      scaleBg = interpolate(p, [0, 1], [1.06, 1.2]);
      pan = p * 0.5;
      break;
    case "pull_out":
      scaleBg = interpolate(p, [0, 1], [1.2, 1.06]);
      pan = p * 0.5;
      break;
    case "pan":
      scaleBg = 1.14;
      pan = p;
      break;
    case "static":
    default:
      scaleBg = interpolate(p, [0, 1], [1.04, 1.06]); // micro-drift, nunca congelado
      pan = p * 0.25;
      break;
  }

  const [dx, dy] = directionVector(movement.direction);
  const panX = dx * MAX_PAN_PX * pan;
  const panY = dy * MAX_PAN_PX * pan;

  // El foreground se mueve más en la misma dirección y escala un poco más.
  const intensity = movement.parallax_intensity;
  const extra = MAX_PARALLAX_PX * intensity * p;
  // Si la dirección es "center" no hay paneo: el parallax nace del
  // diferencial de escala + un leve flotar vertical del foreground.
  const isCenter = dx === 0 && dy === 0;
  const fgX = panX + (isCenter ? 0 : dx * extra);
  const fgY = panY + (isCenter ? extra * 0.4 : dy * extra);
  const scaleFg = scaleBg * (1 + 0.05 * intensity);

  // El relleno borroso hace un drift mínimo en sentido contrario.
  const fillX = -panX * 0.15;
  const fillY = -panY * 0.15;

  return {
    fill: `scale(1.18) translate(${fillX.toFixed(2)}px, ${fillY.toFixed(2)}px)`,
    background: `translate(${panX.toFixed(2)}px, ${panY.toFixed(2)}px) scale(${scaleBg.toFixed(4)})`,
    foreground: `translate(${fgX.toFixed(2)}px, ${fgY.toFixed(2)}px) scale(${scaleFg.toFixed(4)})`,
  };
}
