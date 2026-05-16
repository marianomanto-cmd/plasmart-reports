// API route: devuelve los filtros disponibles (tipos + campañas) para el
// rango y publisher actuales. Se usa desde el client FiltersBar que vive
// en el AppShell drawer, así no necesita prop-drill desde cada page.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAvailableFilters } from "@/lib/queries";
import { isValidIsoDate } from "@/lib/dates";
import type { Publisher } from "@/lib/types";

const VALID_PUBLISHERS: Publisher[] = ["gads", "meta"];

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email?.endsWith("@transfil.com.ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const publisherRaw = url.searchParams.get("publisher");
  const publisher = VALID_PUBLISHERS.includes(publisherRaw as Publisher)
    ? (publisherRaw as Publisher)
    : undefined;

  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return NextResponse.json(
      { error: "Rango from/to inválido" },
      { status: 400 },
    );
  }

  try {
    const available = await fetchAvailableFilters(from, to, publisher);
    return NextResponse.json(available);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
