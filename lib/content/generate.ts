import type { SupabaseClient } from "@supabase/supabase-js";
import { pickPillar, type PillarKey } from "./pillars";
import { directArt } from "./anthropic";
import { downloadDriveFile } from "@/lib/google/drive";
import type { VisionAnalysis } from "./prompts";
import type { Composition, ContentOrientation, MotionPotential } from "./types";

// Cerebro editorial (sección 9): elige pilar → imagen sin usar → director de
// arte → crea content_post (draft) + render_job (pending). Reutilizable por
// las rutas de generar y regenerar.

export class GenerateError extends Error {
  constructor(
    readonly code: "NO_IMAGE",
    message: string,
  ) {
    super(message);
  }
}

interface ImageRow {
  id: string;
  drive_file_id: string;
  file_name: string;
  subject: PillarKey;
  orientation: ContentOrientation;
  motion_potential: MotionPotential;
  composition: Composition | null;
  times_used: number;
}

const IMAGE_FIELDS =
  "id, drive_file_id, file_name, subject, orientation, motion_potential, composition, times_used";

export interface GenerateOptions {
  pillar?: PillarKey; // forzar pilar; si no, rotación
  imageId?: string; // forzar una imagen específica
  excludeImageId?: string; // evitar esta imagen (regenerar con otra)
}

export interface GeneratedPost {
  postId: string;
  pillar: PillarKey;
  caption: string;
  imageId: string;
}

async function pickImage(
  admin: SupabaseClient,
  pillar: PillarKey,
  opts: GenerateOptions,
): Promise<ImageRow | null> {
  // Imagen forzada (regenerar manteniendo la foto).
  if (opts.imageId) {
    const { data } = await admin
      .from("content_image")
      .select(IMAGE_FIELDS)
      .eq("id", opts.imageId)
      .maybeSingle();
    return (data as ImageRow | null) ?? null;
  }

  // Preferimos imágenes del pilar, menos usadas primero; si no hay, caemos a
  // cualquier imagen analizada menos usada (mejor algo que nada).
  const order = (q: any) =>
    q
      .not("subject", "is", null)
      .not("analyzed_at", "is", null)
      .order("times_used", { ascending: true })
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .limit(1);

  let base = admin.from("content_image").select(IMAGE_FIELDS).eq("subject", pillar);
  if (opts.excludeImageId) base = base.neq("id", opts.excludeImageId);
  const { data: byPillar } = await order(base);
  if (byPillar && byPillar.length > 0) return byPillar[0] as ImageRow;

  let any = admin.from("content_image").select(IMAGE_FIELDS);
  if (opts.excludeImageId) any = any.neq("id", opts.excludeImageId);
  const { data: anyImg } = await order(any);
  return anyImg && anyImg.length > 0 ? (anyImg[0] as ImageRow) : null;
}

export async function generatePost(
  admin: SupabaseClient,
  opts: GenerateOptions = {},
): Promise<GeneratedPost> {
  // 1. Pilar: forzado o rotación evitando el último.
  let pillar = opts.pillar;
  if (!pillar) {
    const { data: last } = await admin
      .from("content_post")
      .select("pillar")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    pillar = pickPillar((last?.pillar as PillarKey) ?? null);
  }

  // 2. Imagen.
  const image = await pickImage(admin, pillar, opts);
  if (!image) {
    throw new GenerateError(
      "NO_IMAGE",
      "No hay imágenes analizadas en el banco. Sincronizá el banco primero.",
    );
  }
  // Si forzamos imagen, respetamos su subject como pilar real.
  if (opts.imageId) pillar = image.subject;

  // 3. Director de arte (vuelve a mirar la foto para afinar el recorte).
  const { buffer, mimeType } = await downloadDriveFile(image.drive_file_id);
  const analysis: VisionAnalysis = {
    subject: image.subject,
    orientation: image.orientation,
    motion_potential: image.motion_potential,
    composition: image.composition ?? {
      subject_zone: "centro",
      background_zone: "borde",
      direction: "horizontal",
    },
  };
  const art = await directArt({
    pillar,
    fileName: image.file_name,
    analysis,
    buffer,
    mime: mimeType,
  });

  // 4. content_post (draft).
  const { data: post, error: postErr } = await admin
    .from("content_post")
    .insert({
      pillar,
      image_id: image.id,
      caption: art.value.caption,
      render_spec: art.value.renderSpec,
      status: "draft",
      claude_model: art.model,
      prompt_tokens: art.promptTokens,
      completion_tokens: art.completionTokens,
    })
    .select("id")
    .single();
  if (postErr || !post) {
    throw new Error(`Insert content_post: ${postErr?.message}`);
  }

  // 5. render_job (pending).
  const { error: jobErr } = await admin.from("render_job").insert({
    post_id: post.id,
    use_ai_i2v: art.value.renderSpec.use_ai_i2v,
  });
  if (jobErr) throw new Error(`Insert render_job: ${jobErr.message}`);

  // 6. Marcar la imagen como usada.
  await admin
    .from("content_image")
    .update({
      times_used: (image.times_used ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", image.id);

  return {
    postId: post.id,
    pillar,
    caption: art.value.caption,
    imageId: image.id,
  };
}
