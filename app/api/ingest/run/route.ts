// API Route: dispara la edge function ingest-reports a demanda.
// Flujo:
//   1. Auth check: usuario @transfil.com.ar.
//   2. Cooldown check: si hubo corrida en los últimos 10 min, rechaza.
//   3. Invoca la edge function con el SERVICE_ROLE_KEY (la function tiene
//      Verify JWT ON, así que el JWT es obligatorio — usamos service role
//      porque ya tenemos auth propia y no queremos depender del JWT del user).
//   4. Espera la respuesta y la devuelve al cliente.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const COOLDOWN_MINUTES = 10;
const INGEST_FUNCTION_URL =
  "https://cihzkrawvajiarkkhsnp.supabase.co/functions/v1/ingest-reports";

export const maxDuration = 60;

interface RunResponseBody {
  ok: boolean;
  message: string;
  cooldownMinutesRemaining?: number;
  startedAt?: string;
  durationMs?: number;
}

export async function POST() {
  // ---- 1. Auth ----
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email?.endsWith("@transfil.com.ar")) {
    return NextResponse.json(
      { ok: false, message: "No autorizado" } satisfies RunResponseBody,
      { status: 401 },
    );
  }

  // ---- 2. Cooldown ----
  const { data: lastRun, error: cooldownErr } = await supabase.rpc(
    "dashboard_last_ingestion",
    { p_within_minutes: COOLDOWN_MINUTES },
  );
  if (cooldownErr) {
    return NextResponse.json(
      {
        ok: false,
        message: `Error consultando cooldown: ${cooldownErr.message}`,
      } satisfies RunResponseBody,
      { status: 500 },
    );
  }

  if (lastRun && lastRun.length > 0) {
    const minutesAgo = Number(lastRun[0].minutes_ago);
    const remaining = Math.max(0, Math.ceil(COOLDOWN_MINUTES - minutesAgo));
    return NextResponse.json(
      {
        ok: false,
        message: `Hace menos de ${COOLDOWN_MINUTES} min que corrió una ingesta.`,
        cooldownMinutesRemaining: remaining,
      } satisfies RunResponseBody,
      { status: 429 },
    );
  }

  // ---- 3. Invocar edge function ----
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        message: "SUPABASE_SERVICE_ROLE_KEY no configurada en el server",
      } satisfies RunResponseBody,
      { status: 500 },
    );
  }

  const startedAt = new Date();

  let edgeResponse: Response;
  try {
    edgeResponse = await fetch(INGEST_FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trigger: "manual", invokedBy: user.email }),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: `Error invocando ingest-reports: ${(err as Error).message}`,
      } satisfies RunResponseBody,
      { status: 502 },
    );
  }

  const durationMs = Date.now() - startedAt.getTime();

  if (!edgeResponse.ok) {
    const text = await edgeResponse.text().catch(() => "");
    return NextResponse.json(
      {
        ok: false,
        message: `ingest-reports respondió ${edgeResponse.status}: ${text.slice(0, 300)}`,
        durationMs,
      } satisfies RunResponseBody,
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Ingesta completada correctamente",
    startedAt: startedAt.toISOString(),
    durationMs,
  } satisfies RunResponseBody);
}
