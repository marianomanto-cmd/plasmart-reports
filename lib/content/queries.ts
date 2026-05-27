import { createClient } from "@/lib/supabase/server";
import type { ContentPostWithImage, WorkerHeartbeat } from "./types";

// Lecturas server-side para la vista /contenido. Usan el cliente con sesión
// del usuario (las policies de RLS habilitan lectura a @transfil.com.ar).

// El worker se considera "online" si mandó heartbeat hace menos de esto.
const WORKER_ONLINE_WINDOW_MS = 90_000;

export async function listContentPosts(
  limit = 40,
): Promise<ContentPostWithImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_post")
    .select(
      "*, image:content_image(id,file_name,orientation,subject)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`No se pudieron leer los posts: ${error.message}`);
  return (data ?? []) as unknown as ContentPostWithImage[];
}

export interface BancoStats {
  total: number;
  analyzed: number;
  pending: number;
}

export async function getBancoStats(): Promise<BancoStats> {
  const supabase = await createClient();
  const [{ count: total }, { count: analyzed }] = await Promise.all([
    supabase.from("content_image").select("*", { count: "exact", head: true }),
    supabase
      .from("content_image")
      .select("*", { count: "exact", head: true })
      .not("analyzed_at", "is", null),
  ]);
  const t = total ?? 0;
  const a = analyzed ?? 0;
  return { total: t, analyzed: a, pending: Math.max(0, t - a) };
}

export interface WorkerStatus {
  online: boolean;
  worker?: WorkerHeartbeat;
}

export async function getWorkerStatus(): Promise<WorkerStatus> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worker_heartbeat")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { online: false };
  const worker = data as WorkerHeartbeat;
  const age = Date.now() - new Date(worker.last_seen_at).getTime();
  return { online: age < WORKER_ONLINE_WINDOW_MS, worker };
}
