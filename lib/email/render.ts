// Renderer del HTML del reporte semanal.
// Una sola función: arma el body completo del mail (KPIs + análisis + charts).

import type {
  CampaignRow,
  DailyByPublisherPoint,
  DashboardKpis,
} from "@/lib/types";
import { formatCurrencyArs, formatInteger } from "@/lib/format";
import {
  renderCostEvolutionSvg,
  renderTopCampaignsSvg,
} from "./charts-svg";

interface ReportData {
  fromIso: string;
  toIso: string;
  kpis: DashboardKpis;
  topCampaigns: CampaignRow[];
  dailyByPublisher: DailyByPublisherPoint[];
  analysisMarkdown: string;
  appUrl: string;
}

export function renderWeeklyReportHtml(data: ReportData): string {
  const rangeLabel = `${humanDate(data.fromIso)} — ${humanDate(data.toIso)}`;
  const costEvolutionSvg = renderCostEvolutionSvg(
    data.dailyByPublisher,
    data.fromIso,
    data.toIso,
  );
  const topCampaignsSvg = renderTopCampaignsSvg(data.topCampaigns);
  const analysisHtml = markdownToHtml(data.analysisMarkdown);

  return `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reporte semanal Plasmart</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">

      <!-- Header -->
      <div style="border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.22em;color:#94a3b8;">
          Reporte semanal
        </p>
        <h1 style="margin:6px 0 0 0;font-size:24px;font-weight:700;letter-spacing:-0.01em;">
          Plasmart · campañas digitales
        </h1>
        <p style="margin:6px 0 0 0;font-size:13px;color:#475569;">
          ${rangeLabel}
        </p>
      </div>

      <!-- KPIs -->
      <table cellspacing="0" cellpadding="0" border="0" role="presentation"
             style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          ${kpiCell("Inversión", formatCurrencyArs(data.kpis.cost.current))}
          ${kpiCell("Conversiones", formatInteger(data.kpis.conversions.current))}
        </tr>
        <tr>
          ${kpiCell("Impresiones", formatInteger(data.kpis.impressions.current))}
          ${kpiCell("Clics", formatInteger(data.kpis.clicks.current))}
        </tr>
      </table>

      <!-- Análisis Claude -->
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 12px 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.22em;color:#94a3b8;">
          Análisis Corey Haines
        </p>
        ${analysisHtml}
      </div>

      <!-- Chart: evolución diaria -->
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 16px 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.22em;color:#94a3b8;">
          Evolución de inversión diaria
        </p>
        ${costEvolutionSvg}
      </div>

      <!-- Chart: top campañas -->
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 16px 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.22em;color:#94a3b8;">
          Top campañas por inversión
        </p>
        ${topCampaignsSvg}
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0 16px 0;">
        <a href="${escapeAttr(data.appUrl)}/dashboard/corey-haines"
           style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">
          Ver reporte completo
        </a>
      </div>

      <!-- Footer -->
      <p style="margin:32px 0 0 0;font-size:11px;text-align:center;color:#94a3b8;letter-spacing:0.12em;text-transform:uppercase;">
        Plasmart Reportería · generado automáticamente
      </p>
    </div>
  </body>
</html>`;
}

function kpiCell(label: string, value: string): string {
  return `
    <td style="width:50%;padding:8px;vertical-align:top;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.22em;color:#94a3b8;">
          ${escapeHtml(label)}
        </p>
        <p style="margin:8px 0 0 0;font-size:24px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;">
          ${escapeHtml(value)}
        </p>
      </div>
    </td>`;
}

/**
 * Markdown muy básico → HTML inline-safe para el email.
 * Soporta: **negritas**, listas `- item` y párrafos por línea en blanco.
 * Suficiente para el output de Claude (no usamos tablas ni enlaces complejos).
 */
function markdownToHtml(md: string): string {
  const lines = md.split(/\n/);
  const out: string[] = [];
  let inList = false;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(" ").trim();
    if (text) {
      out.push(
        `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#0f172a;">${formatInline(text)}</p>`,
      );
    }
    paragraphBuffer = [];
  };

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      closeList();
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      if (!inList) {
        out.push(
          `<ul style="margin:0 0 12px 20px;padding:0;font-size:14px;line-height:1.6;color:#0f172a;">`,
        );
        inList = true;
      }
      const item = line.replace(/^\s*[-*]\s+/, "");
      out.push(`<li style="margin:0 0 4px 0;">${formatInline(item)}</li>`);
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      flushParagraph();
      closeList();
      const text = line.replace(/^#{1,3}\s+/, "");
      out.push(
        `<h3 style="margin:20px 0 8px 0;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#0f172a;">${formatInline(text)}</h3>`,
      );
      continue;
    }

    closeList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  closeList();
  return out.join("\n");
}

function formatInline(text: string): string {
  // **bold** → <strong>
  return escapeHtml(text).replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="font-weight:600;">$1</strong>',
  );
}

function humanDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
