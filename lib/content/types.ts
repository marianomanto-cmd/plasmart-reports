// Tipos de las filas de las tablas del motor de contenido (Fase 8).
import type { PillarKey } from "./pillars";
import type { RenderSpec } from "./render-spec";

export type ContentOrientation = "portrait" | "landscape" | "square";
export type MotionPotential = "low" | "medium" | "high";
export type ContentPostStatus = "draft" | "rendered" | "published" | "skipped";
export type RenderJobStatus = "pending" | "processing" | "done" | "error";

/** Análisis de composición que escribe Claude vision (jsonb). */
export interface Composition {
  subject_zone: string; // dónde está el sujeto ("derecha", "centro-abajo", ...)
  background_zone: string; // qué zona es fondo liso
  direction: string; // dirección de la composición ("horizontal", "diagonal", ...)
  notes?: string;
}

export interface ContentImage {
  id: string;
  drive_file_id: string;
  file_name: string;
  subject: PillarKey | null;
  orientation: ContentOrientation | null;
  composition: Composition | null;
  motion_potential: MotionPotential | null;
  depth_map_path: string | null;
  times_used: number;
  last_used_at: string | null;
  analyzed_at: string | null;
  added_at: string;
}

export interface ContentPost {
  id: string;
  scheduled_date: string;
  pillar: PillarKey;
  image_id: string | null;
  caption: string | null;
  render_spec: RenderSpec;
  status: ContentPostStatus;
  claude_model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  video_file_id: string | null;
  rendered_at: string | null;
  created_at: string;
}

/** Post + datos de su imagen, como lo consume la UI. */
export interface ContentPostWithImage extends ContentPost {
  image: Pick<
    ContentImage,
    "id" | "file_name" | "orientation" | "subject"
  > | null;
}

export interface WorkerHeartbeat {
  worker_id: string;
  last_seen_at: string;
  gpu_name: string | null;
  status: "idle" | "rendering";
}
