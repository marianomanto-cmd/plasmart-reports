// API Route: hace streaming del MP4 renderizado desde Drive. El worker sube el
// video a /videos/ y guarda su id en content_post.video_file_id; acá lo
// servimos (con la credencial del server) para preview y descarga.

import { NextResponse } from "next/server";
import { requireTransfilUser } from "@/lib/content/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { driveMediaResponse } from "@/lib/google/drive";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTransfilUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: post } = await admin
    .from("content_post")
    .select("video_file_id")
    .eq("id", id)
    .maybeSingle();

  if (!post?.video_file_id) {
    return NextResponse.json({ error: "Video todavía no disponible" }, {
      status: 404,
    });
  }

  let driveRes: Response;
  try {
    driveRes = await driveMediaResponse(post.video_file_id);
  } catch (err) {
    return NextResponse.json(
      { error: `Drive: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Cache-Control": "private, max-age=3600",
  });
  const len = driveRes.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  if (download) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="plasmart-${id}.mp4"`,
    );
  }

  return new Response(driveRes.body, { status: 200, headers });
}
