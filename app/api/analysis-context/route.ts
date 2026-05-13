// API route para leer y editar el contexto que se inyecta en los
// análisis de Claude / Corey Haines.
//
//   GET  → devuelve la fila singleton de analysis_context.
//   PUT  → actualiza los 10 campos editables. El trigger de DB pone
//          updated_at = now() y updated_by = auth.email().
//
// Auth: igual que el resto de las API routes, exigimos un usuario
// autenticado con email @transfil.com.ar. La policy de RLS ya filtra,
// pero re-validamos acá para responder 401 antes de tocar la DB.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadAnalysisContext } from "@/lib/ai/account-context";
import type { AnalysisContext } from "@/lib/types";

interface PutBody {
  company?: string;
  audience?: string;
  economics?: string;
  tracking?: string;
  focus?: string;
  decision?: string;
  businessContext?: string;
  scope?: string;
  rules?: string;
  outputTone?: string;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email?.endsWith("@transfil.com.ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const context = await loadAnalysisContext(supabase);
  return NextResponse.json({ context } satisfies { context: AnalysisContext });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email?.endsWith("@transfil.com.ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Mapeo camelCase → snake_case. Solo seteamos campos que vinieron en
  // el body; los ausentes mantienen su valor previo.
  const update: Record<string, string> = {};
  if (typeof body.company === "string") update.company = body.company;
  if (typeof body.audience === "string") update.audience = body.audience;
  if (typeof body.economics === "string") update.economics = body.economics;
  if (typeof body.tracking === "string") update.tracking = body.tracking;
  if (typeof body.focus === "string") update.focus = body.focus;
  if (typeof body.decision === "string") update.decision = body.decision;
  if (typeof body.businessContext === "string")
    update.business_context = body.businessContext;
  if (typeof body.scope === "string") update.scope = body.scope;
  if (typeof body.rules === "string") update.rules = body.rules;
  if (typeof body.outputTone === "string") update.output_tone = body.outputTone;

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No hay campos para actualizar" },
      { status: 400 },
    );
  }

  const { error: updateErr } = await supabase
    .from("analysis_context")
    .update(update)
    .eq("id", 1);

  if (updateErr) {
    return NextResponse.json(
      { error: `No se pudo guardar: ${updateErr.message}` },
      { status: 500 },
    );
  }

  // Devolvemos el contexto actualizado para que el cliente tenga el
  // updated_at fresco (sirve para invalidar el cache local si fuera).
  const context = await loadAnalysisContext(supabase);
  return NextResponse.json({ context } satisfies { context: AnalysisContext });
}
