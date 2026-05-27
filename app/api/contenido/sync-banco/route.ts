// API Route: sincroniza el banco de Drive con la tabla content_image y
// auto-analiza con Claude vision las imágenes nuevas (subject, orientación,
// composición, potencial de movimiento). Por ahora el análisis vive acá (en
// Vercel) para poder probar el flujo sin el worker.

import { NextResponse } from "next/server";
import { requireTransfilUser } from "@/lib/content/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listImagesInFolder, downloadDriveFile } from "@/lib/google/drive";
import { analyzeImageWithVision } from "@/lib/content/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cuántas imágenes sin analizar procesamos por corrida (acota tiempo/costo).
const ANALYZE_BATCH = 6;

export async function POST() {
  const user = await requireTransfilUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const folderId = process.env.DRIVE_FOLDER_BANCO;
  if (!folderId) {
    return NextResponse.json(
      { error: "DRIVE_FOLDER_BANCO no configurada en el server" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();

  // ---- 1. Listar Drive y detectar archivos nuevos ----
  let driveFiles;
  try {
    driveFiles = await listImagesInFolder(folderId);
  } catch (err) {
    return NextResponse.json(
      { error: `Drive: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const { data: existing } = await admin
    .from("content_image")
    .select("drive_file_id");
  const known = new Set((existing ?? []).map((r) => r.drive_file_id));

  const toInsert = driveFiles
    .filter((f) => !known.has(f.id))
    .map((f) => ({ drive_file_id: f.id, file_name: f.name }));

  let added = 0;
  if (toInsert.length > 0) {
    const { error } = await admin.from("content_image").insert(toInsert);
    if (error) {
      return NextResponse.json(
        { error: `Insert content_image: ${error.message}` },
        { status: 500 },
      );
    }
    added = toInsert.length;
  }

  // ---- 2. Analizar un lote de imágenes sin analizar ----
  const { data: pending } = await admin
    .from("content_image")
    .select("id, drive_file_id, file_name")
    .is("analyzed_at", null)
    .limit(ANALYZE_BATCH);

  let analyzed = 0;
  const errors: string[] = [];
  for (const img of pending ?? []) {
    try {
      const { buffer, mimeType } = await downloadDriveFile(img.drive_file_id);
      const { value } = await analyzeImageWithVision(
        buffer,
        mimeType,
        img.file_name,
      );
      const { error } = await admin
        .from("content_image")
        .update({
          subject: value.subject,
          orientation: value.orientation,
          motion_potential: value.motion_potential,
          composition: value.composition,
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", img.id);
      if (error) errors.push(`${img.file_name}: ${error.message}`);
      else analyzed++;
    } catch (err) {
      errors.push(`${img.file_name}: ${(err as Error).message}`);
    }
  }

  // ¿Quedan sin analizar después de este lote?
  const { count: stillPending } = await admin
    .from("content_image")
    .select("*", { count: "exact", head: true })
    .is("analyzed_at", null);

  return NextResponse.json({
    ok: true,
    added,
    analyzed,
    pending: stillPending ?? 0,
    total: driveFiles.length,
    errors: errors.slice(0, 5),
  });
}
