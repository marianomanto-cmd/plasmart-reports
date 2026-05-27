// API Route: hace streaming de una imagen del banco desde Drive (preview de
// la foto fuente de un post o del banco). `id` = content_image.id.

import { NextResponse } from "next/server";
import { requireTransfilUser } from "@/lib/content/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { driveMediaResponse } from "@/lib/google/drive";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTransfilUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: image } = await admin
    .from("content_image")
    .select("drive_file_id")
    .eq("id", id)
    .maybeSingle();

  if (!image?.drive_file_id) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  let driveRes: Response;
  try {
    driveRes = await driveMediaResponse(image.drive_file_id);
  } catch (err) {
    return NextResponse.json(
      { error: `Drive: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const headers = new Headers({
    "Content-Type": driveRes.headers.get("content-type") ?? "image/jpeg",
    "Cache-Control": "private, max-age=86400",
  });
  return new Response(driveRes.body, { status: 200, headers });
}
