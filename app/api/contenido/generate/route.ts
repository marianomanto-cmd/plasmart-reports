// API Route: "generar contenido". Dispara el cerebro editorial → crea un
// content_post (draft) + render_job (pending) que el worker tomará.

import { NextResponse } from "next/server";
import { requireTransfilUser } from "@/lib/content/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePost, GenerateError } from "@/lib/content/generate";
import { isPillarKey } from "@/lib/content/pillars";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await requireTransfilUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Body opcional: { pillar?: PillarKey } para forzar un pilar.
  let pillar: string | undefined;
  try {
    const body = (await request.json()) as { pillar?: string };
    pillar = body?.pillar;
  } catch {
    // sin body → rotación normal
  }

  const admin = createAdminClient();
  try {
    const result = await generatePost(admin, {
      pillar: isPillarKey(pillar) ? pillar : undefined,
    });
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
