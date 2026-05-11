// GET /api/corey-haines/pdf?from=...&to=...&compare=...&publisher=...&type=...&campaign=...
// Devuelve el PDF del último análisis de Corey Haines cacheado para esa
// combinación de filtros + período. No vuelve a llamar a Claude; sólo
// repone el PDF a partir del contenido del cache y los datos actuales
// del período.
//
// Si no hay análisis cacheado para esos filtros, devuelve 404 — el
// usuario debe generarlo desde el dashboard primero.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseFilters } from "@/lib/filters";
import { hashFilters } from "@/lib/ai/hash";
import {
  fetchCampaignRows,
  fetchDailyTotals,
  fetchKpis,
  fetchPublisherComparison,
} from "@/lib/queries";
import { renderCoreyPdf } from "@/lib/pdf/render-corey-pdf";

const NAMESPACE = "corey";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email?.endsWith("@transfil.com.ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams));

  // Fecha máxima de datos
  const { data: maxDateData, error: maxDateErr } = await supabase.rpc(
    "dashboard_max_data_date",
    { p_from: filters.from, p_to: filters.to },
  );
  if (maxDateErr) {
    return NextResponse.json(
      { error: `Error consultando datos: ${maxDateErr.message}` },
      { status: 500 },
    );
  }
  const maxDate = maxDateData as string | null;
  if (!maxDate) {
    return NextResponse.json(
      { error: "Sin datos en el período" },
      { status: 404 },
    );
  }

  // Cache lookup
  const filtersHash = hashFilters(filters, NAMESPACE);
  const { data: cacheData, error: cacheErr } = await supabase.rpc(
    "dashboard_ai_cache_lookup",
    { p_filters_hash: filtersHash, p_data_max_date: maxDate },
  );
  if (cacheErr) {
    return NextResponse.json(
      { error: `Error consultando cache: ${cacheErr.message}` },
      { status: 500 },
    );
  }
  if (!cacheData || cacheData.length === 0) {
    return NextResponse.json(
      { error: "No hay análisis generado para este período. Generalo desde el dashboard." },
      { status: 404 },
    );
  }
  const cached = cacheData[0];

  // Datos para los gráficos
  let kpis;
  let daily;
  let comparison;
  let topCampaigns;
  try {
    [kpis, daily, comparison, topCampaigns] = await Promise.all([
      fetchKpis(filters),
      fetchDailyTotals(filters),
      fetchPublisherComparison(filters),
      fetchCampaignRows(filters, 15),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: `Error obteniendo datos: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  let pdf: Buffer;
  try {
    pdf = await renderCoreyPdf({
      filters,
      kpis,
      daily,
      comparison,
      topCampaigns,
      content: cached.content,
      generatedAt: cached.generated_at,
      modelUsed: cached.model_used,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Error generando PDF: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  const filename = `plasmart-corey-${filters.from}_a_${filters.to}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
