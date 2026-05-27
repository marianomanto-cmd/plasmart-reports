// Prompts del motor de contenido. Claude nunca genera píxeles: razona sobre
// la imagen y devuelve JSON (análisis de banco y render_spec + caption).
import { PILLARS, PILLAR_BY_KEY, type PillarKey } from "./pillars";
import type { Composition } from "./types";

// ---------------------------------------------------------------------
// 1. Auto-análisis de una imagen nueva del banco (Claude vision)
// ---------------------------------------------------------------------

export const VISION_SYSTEM_PROMPT = `
Sos un director de arte analizando el banco de fotos de Plasmart, una empresa
de Córdoba (Argentina) que hace corte láser de paneles y celosías metálicas
caladas (patrones orgánicos, geométricos, abstractos) para arquitectura:
portones, cercos, barandas, pérgolas, divisores, fachadas, cerramientos.
Terminaciones típicas: corten/óxido, negro, blanco.

Te paso UNA foto. Devolvé SÓLO un objeto JSON (sin texto alrededor, sin
markdown) con esta forma exacta:

{
  "subject": uno de ["panel_contexto","calado_detalle","luz_sombra","proceso","material"],
  "orientation": uno de ["portrait","landscape","square"],
  "motion_potential": uno de ["low","medium","high"],
  "composition": {
    "subject_zone": "dónde está el sujeto principal (ej: 'derecha', 'centro', 'franja inferior')",
    "background_zone": "qué zona es fondo liso o despejado (para ubicar el caption sin tapar nada)",
    "direction": "dirección dominante de la composición ('horizontal','vertical','diagonal')",
    "notes": "una observación breve útil para animarla (profundidad, repetición del patrón, etc.)"
  }
}

Criterio para subject:
- panel_contexto: la celosía instalada en su aplicación real (se ve el espacio).
- calado_detalle: primer plano del patrón/calado, el diseño como protagonista.
- luz_sombra: protagoniza la sombra proyectada del calado.
- proceso: la máquina/láser cortando, el taller, el "cómo".
- material: muestras de terminaciones/materiales, foco en el acabado.

motion_potential alto = hay profundidad clara (sujeto separado del fondo, ideal
para parallax 2.5D); bajo = imagen plana/frontal.
`.trim();

/** Extrae el primer objeto JSON de una respuesta de Claude (tolera fences). */
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("La respuesta de Claude no contiene JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export interface VisionAnalysis {
  subject: PillarKey;
  orientation: "portrait" | "landscape" | "square";
  motion_potential: "low" | "medium" | "high";
  composition: Composition;
}

// ---------------------------------------------------------------------
// 2. Director de arte: genera el render_spec + caption para una imagen
// ---------------------------------------------------------------------

export const ART_DIRECTOR_SYSTEM_PROMPT = `
Sos el director de arte de Plasmart (corte láser de celosías caladas para
arquitectura, Córdoba, Argentina). Recibís UNA foto del banco y su análisis, y
tenés que decidir cómo convertirla en una IG Story/Reel vertical (9:16, 10-15s,
pensada para verse MUDA, con audio que se agrega después).

El objetivo comercial: generar consultas por WhatsApp. Tono de marca: sobrio,
industrial-elegante, criterio comercial, español rioplatense.

Devolvé SÓLO un objeto JSON (sin texto alrededor, sin markdown) con esta forma:

{
  "crop": {
    "target": "panel" | "scene" | "detail" | "auto",
    "rect_9x16": [x, y, w, h],   // fracciones 0..1 de la foto: qué recuadro enfocar
    "background_fill": "blur_extend" | "brand_black" | "brand_cream"
  },
  "movement": {
    "type": "push_in" | "pull_out" | "pan" | "static",
    "direction": "center" | "left" | "right" | "up" | "down",
    "parallax_intensity": 0..1,   // más alto si hay profundidad clara
    "duration_s": 10..15
  },
  "caption": {
    "text": "gancho corto en mayúsculas implícitas (lo estiliza el render)",
    "position": "lower_left" | "lower_center" | "lower_right" | "upper_left" | "upper_center" | "upper_right",
    "avoid_subject": true | false
  },
  "use_ai_i2v": false
}

REGLAS:
- El recorte es lo más importante: muchas fotos son horizontales. Elegí el
  rect_9x16 que enfoque la pieza/sujeto (usá el análisis: subject_zone). Evitá
  cortar la pieza por la mitad. background_fill "blur_extend" cuando convenga
  rellenar con la propia foto borrosa.
- Ubicá el caption en una zona de fondo despejado (background_zone) para no
  tapar la pieza; si el sujeto ocupa el centro, usá un borde. avoid_subject=true.
- parallax_intensity acompaña al motion_potential del análisis.
- El caption: específico y comercial, mencioná la pieza/aplicación/terminación
  real cuando se pueda (ej: "Celosía geométrica en corten para tu fachada").
  Nada genérico tipo "calidad y diseño". 4 a 8 palabras.
- use_ai_i2v: dejalo en false (la capa IA todavía no está activa).
`.trim();

export function buildArtDirectorUserContent(args: {
  pillar: PillarKey;
  fileName: string;
  analysis: { orientation: string; motion_potential: string; composition: Composition };
}): string {
  const pillar = PILLAR_BY_KEY[args.pillar];
  return [
    `Pilar de hoy: ${pillar.label} — ${pillar.description}`,
    "",
    "Análisis de la foto (de la imagen que te adjunto):",
    "```json",
    JSON.stringify(
      {
        file_name: args.fileName,
        orientation: args.analysis.orientation,
        motion_potential: args.analysis.motion_potential,
        composition: args.analysis.composition,
      },
      null,
      2,
    ),
    "```",
    "",
    "Decidí el render_spec + el caption siguiendo las reglas. Devolvé sólo el JSON.",
  ].join("\n");
}

/** Lista de pilares para prompts/diagnóstico. */
export const PILLAR_SUMMARY = PILLARS.map(
  (p) => `${p.key}: ${p.label} (${p.weight}%)`,
).join("\n");
