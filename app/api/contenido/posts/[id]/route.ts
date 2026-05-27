// API Route: cambia el estado de un content_post (ej: marcar 'published'
// cuando Mariano lo subió a IG, o 'skipped' para descartarlo).

import { NextResponse } from "next/server";
import { requireTransfilUser } from "@/lib/content/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const VALID = ["draft", "rendered", "published", "skipped"] as const;
type Status = (typeof VALID)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTransfilUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  let body: { status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.status || !(VALID as readonly string[]).includes(body.status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("content_post")
    .update({ status: body.status as Status })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: body.status });
}
