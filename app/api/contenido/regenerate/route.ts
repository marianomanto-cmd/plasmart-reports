// API Route: "regenerar" un post. Descarta el actual (skipped) y genera uno
// nuevo: con OTRA imagen del mismo pilar (mode 'image', default) o con la
// MISMA imagen pero que Claude redecida el render_spec (mode 'spec').

import { NextResponse } from "next/server";
import { requireTransfilUser } from "@/lib/content/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePost, GenerateError } from "@/lib/content/generate";
import type { PillarKey } from "@/lib/content/pillars";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await requireTransfilUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { postId?: string; mode?: "image" | "spec" };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  if (!body.postId) {
    return NextResponse.json({ error: "Falta postId" }, { status: 400 });
  }
  const mode = body.mode === "spec" ? "spec" : "image";

  const admin = createAdminClient();

  const { data: old } = await admin
    .from("content_post")
    .select("id, pillar, image_id")
    .eq("id", body.postId)
    .maybeSingle();
  if (!old) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  try {
    const result = await generatePost(admin, {
      pillar: old.pillar as PillarKey,
      imageId: mode === "spec" ? (old.image_id ?? undefined) : undefined,
      excludeImageId: mode === "image" ? (old.image_id ?? undefined) : undefined,
    });

    // Descartar el viejo (y cancelar su job pendiente si lo hubiera).
    await admin
      .from("content_post")
      .update({ status: "skipped" })
      .eq("id", old.id);
    await admin
      .from("render_job")
      .update({ status: "error", error_message: "regenerado" })
      .eq("post_id", old.id)
      .eq("status", "pending");

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof GenerateError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
