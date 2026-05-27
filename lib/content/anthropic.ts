import Anthropic from "@anthropic-ai/sdk";
import {
  ART_DIRECTOR_SYSTEM_PROMPT,
  VISION_SYSTEM_PROMPT,
  buildArtDirectorUserContent,
  extractJson,
  type VisionAnalysis,
} from "./prompts";
import { coerceRenderSpec, type RenderSpec } from "./render-spec";
import { isPillarKey, type PillarKey } from "./pillars";
import type { Composition } from "./types";

// Modelo barato con visión para el cerebro editorial (sección 9 de la spec).
export const CONTENT_MODEL =
  process.env.ANTHROPIC_CONTENT_MODEL ?? "claude-haiku-4-5";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");
  return new Anthropic({ apiKey });
}

const VALID_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMedia = (typeof VALID_MEDIA)[number];
function mediaType(m: string): ImageMedia {
  return (VALID_MEDIA as readonly string[]).includes(m)
    ? (m as ImageMedia)
    : "image/jpeg";
}

function textOf(res: Anthropic.Message): string {
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export interface AiResult<T> {
  value: T;
  promptTokens: number | null;
  completionTokens: number | null;
  model: string;
}

function usage(res: Anthropic.Message) {
  return {
    promptTokens: res.usage?.input_tokens ?? null,
    completionTokens: res.usage?.output_tokens ?? null,
    model: CONTENT_MODEL,
  };
}

function normalizeComposition(c: unknown): Composition {
  const raw = (c ?? {}) as Record<string, unknown>;
  const str = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() ? v.trim() : fallback;
  return {
    subject_zone: str(raw.subject_zone, "centro"),
    background_zone: str(raw.background_zone, "borde"),
    direction: str(raw.direction, "horizontal"),
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
  };
}

/** Analiza una imagen del banco con Claude vision → metadatos. */
export async function analyzeImageWithVision(
  buffer: Buffer,
  mime: string,
  fileName: string,
): Promise<AiResult<VisionAnalysis>> {
  const res = await getClient().messages.create({
    model: CONTENT_MODEL,
    max_tokens: 600,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType(mime),
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: `Analizá esta foto (archivo: ${fileName}). Devolvé sólo el JSON.`,
          },
        ],
      },
    ],
  });

  const parsed = extractJson<Record<string, unknown>>(textOf(res));
  const orientation = parsed.orientation;
  const motion = parsed.motion_potential;
  const value: VisionAnalysis = {
    subject: isPillarKey(parsed.subject) ? parsed.subject : "calado_detalle",
    orientation:
      orientation === "portrait" || orientation === "square"
        ? orientation
        : "landscape",
    motion_potential:
      motion === "low" || motion === "high" ? motion : "medium",
    composition: normalizeComposition(parsed.composition),
  };
  return { value, ...usage(res) };
}

/** Director de arte: produce el render_spec + caption para una imagen. */
export async function directArt(args: {
  pillar: PillarKey;
  fileName: string;
  analysis: VisionAnalysis;
  buffer: Buffer;
  mime: string;
}): Promise<AiResult<{ renderSpec: RenderSpec; caption: string }>> {
  const res = await getClient().messages.create({
    model: CONTENT_MODEL,
    max_tokens: 700,
    system: ART_DIRECTOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType(args.mime),
              data: args.buffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: buildArtDirectorUserContent({
              pillar: args.pillar,
              fileName: args.fileName,
              analysis: args.analysis,
            }),
          },
        ],
      },
    ],
  });

  const parsed = extractJson<Record<string, any>>(textOf(res));
  const renderSpec = coerceRenderSpec(parsed);
  const caption =
    renderSpec.caption.text ||
    (typeof parsed?.caption?.text === "string" ? parsed.caption.text : "");
  return { value: { renderSpec, caption }, ...usage(res) };
}
