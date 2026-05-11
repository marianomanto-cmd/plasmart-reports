// Envía por email el reporte Corey Haines en PDF a la lista de destinatarios.
//
// Destinatarios por defecto: mantovanimariano@transfil.com.ar y
// ventasplasmart@transfil.com.ar. Se pueden override con la env var
// COREY_REPORT_RECIPIENTS (comma-separated).
//
// Service: Resend. Necesita RESEND_API_KEY. El "from" por defecto usa el
// dominio sandbox de Resend (onboarding@resend.dev); para producción
// conviene verificar transfil.com.ar y setear COREY_REPORT_EMAIL_FROM.

import { Resend } from "resend";
import type { DashboardFilters } from "@/lib/types";

const DEFAULT_RECIPIENTS = [
  "mantovanimariano@transfil.com.ar",
  "ventasplasmart@transfil.com.ar",
];

const DEFAULT_FROM = "Plasmart Reportes <onboarding@resend.dev>";

export interface SendCoreyEmailParams {
  pdf: Buffer;
  filters: DashboardFilters;
  generatedAt: string;
  modelUsed: string;
}

export interface SendCoreyEmailResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  id?: string;
}

export async function sendCoreyReportEmail(
  params: SendCoreyEmailParams,
): Promise<SendCoreyEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, skipped: true, reason: "RESEND_API_KEY no configurada" };
  }

  const from = process.env.COREY_REPORT_EMAIL_FROM ?? DEFAULT_FROM;
  const to = parseRecipients(process.env.COREY_REPORT_RECIPIENTS) ?? DEFAULT_RECIPIENTS;

  const resend = new Resend(apiKey);
  const subject = buildSubject(params.filters);
  const html = buildBodyHtml(params);
  const filename = buildFilename(params.filters);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments: [
      {
        filename,
        content: params.pdf,
      },
    ],
  });

  if (error) {
    return { ok: false, reason: error.message };
  }

  return { ok: true, id: data?.id };
}

// ---------- Helpers ----------

function parseRecipients(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return list.length > 0 ? list : null;
}

function buildSubject(filters: DashboardFilters): string {
  return `Reporte Corey Haines · Plasmart · ${formatDate(filters.from)} a ${formatDate(filters.to)}`;
}

function buildFilename(filters: DashboardFilters): string {
  return `plasmart-corey-${filters.from}_a_${filters.to}.pdf`;
}

function buildBodyHtml({
  filters,
  generatedAt,
  modelUsed,
}: SendCoreyEmailParams): string {
  const period = `${formatDate(filters.from)} — ${formatDate(filters.to)}`;
  const filtersLabel = describeFilters(filters);
  const generated = formatTimestamp(generatedAt);

  return `<!doctype html>
<html lang="es">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 560px; margin: 24px auto; padding: 0 20px;">
  <div style="border-top: 3px solid #1a1a1a; padding-top: 16px;">
    <p style="font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #1a1a1a; font-weight: 600; margin: 0 0 8px 0;">
      Reporte Corey Haines · Plasmart Reportería
    </p>
    <p style="font-size: 18px; font-weight: bold; margin: 0;">${escapeHtml(period)}</p>
    <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a8a8a; margin-top: 8px;">
      ${escapeHtml(filtersLabel)}
    </p>
  </div>
  <p style="font-size: 14px; margin-top: 20px;">
    Adjunto el reporte ejecutivo del período generado automáticamente con
    los frameworks de Corey Haines aplicados a los datos de Google Ads,
    Meta Ads y GA4.
  </p>
  <p style="font-size: 14px;">
    El PDF incluye los KPIs, gráficos de tendencia y distribución por
    publisher, el ranking de campañas y el análisis con recomendaciones
    priorizadas + tests sugeridos.
  </p>
  <div style="border-top: 1px solid #d0d0d0; padding-top: 12px; margin-top: 32px; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #8a8a8a;">
    Generado: ${escapeHtml(generated)} · ${escapeHtml(modelUsed)}
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Cordoba",
  }).format(new Date(iso));
}

function describeFilters(f: DashboardFilters): string {
  const parts: string[] = [];
  parts.push(
    f.publisher === "gads"
      ? "Google Ads"
      : f.publisher === "meta"
      ? "Meta Ads"
      : "Todos los publishers",
  );
  if (f.type) parts.push(f.type.toUpperCase());
  if (f.campaignId) parts.push("Campaña específica");
  if (f.compare === "yoy") parts.push("vs año anterior");
  else if (f.compare === "previous") parts.push("vs período anterior");
  return parts.join(" · ");
}
