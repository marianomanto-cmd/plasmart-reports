// Componente PDF del reporte Corey Haines.
// Usa @react-pdf/renderer para renderizar server-side (Node) un PDF con
// el mismo contenido del análisis + gráficos SVG dibujados a mano. La
// estética sigue los lineamientos visuales del proyecto (negro/cobre,
// fondo cremoso, sin gradientes).
//
// Este archivo es SOLO server. No importarlo desde un Client Component.

import {
  Document,
  G,
  Line,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  CampaignRow,
  DailyTotalsPoint,
  DashboardFilters,
  DashboardKpis,
  PublisherComparison,
} from "@/lib/types";

export interface CoreyPdfData {
  filters: DashboardFilters;
  kpis: DashboardKpis;
  daily: DailyTotalsPoint[];
  comparison: PublisherComparison;
  topCampaigns: CampaignRow[];
  content: string;
  generatedAt: string;
  modelUsed: string;
}

const COLORS = {
  primary: "#1A1A1A",
  steel: "#4A4A4A",
  light: "#8A8A8A",
  border: "#D0D0D0",
  cream: "#F5F5F0",
  white: "#FFFFFF",
  accent: "#C9A961",
  success: "#5C8A5C",
  warning: "#B8704A",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    color: COLORS.primary,
    fontSize: 10,
    lineHeight: 1.45,
  },
  header: {
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    borderTopStyle: "solid",
    paddingTop: 10,
    marginBottom: 18,
  },
  headerLabel: {
    fontSize: 8,
    letterSpacing: 1.8,
    color: COLORS.primary,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerPeriod: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 8,
    color: COLORS.light,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderBottomStyle: "solid",
  },
  // KPIs
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  kpiCard: {
    width: "25%",
    paddingHorizontal: 4,
  },
  kpiCardInner: {
    backgroundColor: COLORS.cream,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    borderLeftStyle: "solid",
  },
  kpiLabel: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: COLORS.light,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  kpiDelta: {
    fontSize: 8,
    marginTop: 2,
  },
  // Tabla top campañas
  table: {
    marginTop: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    borderBottomStyle: "solid",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    borderBottomStyle: "solid",
  },
  th: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.primary,
  },
  td: {
    fontSize: 9,
    color: COLORS.primary,
  },
  tdMuted: {
    fontSize: 9,
    color: COLORS.steel,
  },
  // Análisis
  analysisTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
  },
  analysisBody: {
    fontSize: 10,
    color: COLORS.primary,
    marginBottom: 4,
  },
  analysisAction: {
    fontSize: 10,
    color: COLORS.steel,
    paddingLeft: 12,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    borderTopStyle: "solid",
    paddingTop: 6,
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: COLORS.light,
  },
});

// ---------- Componente principal ----------

export function CoreyReportPdf({ data }: { data: CoreyPdfData }) {
  return (
    <Document
      title={`Plasmart Corey Haines ${data.filters.from} a ${data.filters.to}`}
      author="Plasmart Reportería"
    >
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <KpisSection kpis={data.kpis} />
        <DailyTrendSection daily={data.daily} />
        <PublisherSection comparison={data.comparison} />
        <TopCampaignsSection rows={data.topCampaigns} />
        <AnalysisSection content={data.content} />
        <Footer data={data} />
      </Page>
    </Document>
  );
}

// ---------- Header ----------

function Header({ data }: { data: CoreyPdfData }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerLabel}>
        Reporte Corey Haines · Plasmart Reportería
      </Text>
      <Text style={styles.headerPeriod}>
        {formatDate(data.filters.from)} — {formatDate(data.filters.to)}
      </Text>
      <Text style={styles.headerMeta}>{describeFilters(data.filters)}</Text>
    </View>
  );
}

// ---------- KPIs ----------

function KpisSection({ kpis }: { kpis: DashboardKpis }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>KPIs del período</Text>
      <View style={styles.kpiGrid}>
        <KpiCard label="Costo" value={formatCurrency(kpis.cost.current)} deltaPct={kpis.cost.deltaPct} invertColors />
        <KpiCard label="Impresiones" value={formatInt(kpis.impressions.current)} deltaPct={kpis.impressions.deltaPct} />
        <KpiCard label="Clicks" value={formatInt(kpis.clicks.current)} deltaPct={kpis.clicks.deltaPct} />
        <KpiCard label="Conversiones" value={formatInt(kpis.conversions.current)} deltaPct={kpis.conversions.deltaPct} />
      </View>
    </View>
  );
}

function KpiCard({
  label,
  value,
  deltaPct,
  invertColors,
}: {
  label: string;
  value: string;
  deltaPct: number | null;
  invertColors?: boolean;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiCardInner}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
        {deltaPct !== null && (
          <Text
            style={[
              styles.kpiDelta,
              { color: deltaColor(deltaPct, invertColors) },
            ]}
          >
            {formatDelta(deltaPct)}
          </Text>
        )}
      </View>
    </View>
  );
}

// ---------- Chart: tendencia diaria de costo ----------

function DailyTrendSection({ daily }: { daily: DailyTotalsPoint[] }) {
  if (daily.length === 0) return null;

  const W = 520;
  const H = 110;
  const PAD = { top: 8, right: 8, bottom: 22, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xs = daily.map((_, i) => i);
  const ys = daily.map((d) => d.cost);
  const yMax = Math.max(...ys, 1);
  const xScale = (i: number) =>
    PAD.left + (xs.length === 1 ? innerW / 2 : (i / (xs.length - 1)) * innerW);
  const yScale = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const path = daily
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(d.cost).toFixed(1)}`)
    .join(" ");

  const areaPath =
    `M ${xScale(0).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} ` +
    daily.map((d, i) => `L ${xScale(i).toFixed(1)} ${yScale(d.cost).toFixed(1)}`).join(" ") +
    ` L ${xScale(daily.length - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;

  const ticksCount = Math.min(6, daily.length);
  const tickStep = Math.max(1, Math.floor(daily.length / ticksCount));
  const xTicks = daily.filter((_, i) => i % tickStep === 0 || i === daily.length - 1);

  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>Tendencia diaria de costo</Text>
      <Svg width={W} height={H}>
        {/* Eje y: 3 grid lines */}
        {[0, 0.5, 1].map((frac, idx) => {
          const y = PAD.top + innerH - frac * innerH;
          return (
            <Line
              key={idx}
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke={COLORS.border}
              strokeWidth={0.5}
            />
          );
        })}
        {/* Y-axis labels */}
        {[0, 0.5, 1].map((frac, idx) => {
          const y = PAD.top + innerH - frac * innerH;
          return (
            <Text
              key={idx}
              x={PAD.left - 4}
              y={y + 2}
              style={{ fontSize: 6, color: COLORS.light, textAlign: "right" }}
            >
              {formatShortCurrency(yMax * frac)}
            </Text>
          );
        })}
        {/* Área */}
        <Path d={areaPath} fill={COLORS.cream} />
        {/* Línea */}
        <Path d={path} stroke={COLORS.primary} strokeWidth={1.2} fill="none" />
        {/* Puntos */}
        {daily.map((d, i) => (
          <Rect
            key={i}
            x={xScale(i) - 1.2}
            y={yScale(d.cost) - 1.2}
            width={2.4}
            height={2.4}
            fill={COLORS.primary}
          />
        ))}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginLeft: PAD.left, marginRight: PAD.right, marginTop: -16 }}>
        {xTicks.map((t, i) => (
          <Text key={i} style={{ fontSize: 6, color: COLORS.light }}>
            {formatDateShort(t.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------- Chart: distribución por publisher ----------

function PublisherSection({ comparison }: { comparison: PublisherComparison }) {
  const { gads, meta, totals } = comparison;
  if (!gads && !meta) return null;

  const items: Array<{ label: string; cost: number; convs: number }> = [];
  if (gads) items.push({ label: "Google Ads", cost: gads.cost, convs: gads.conversions });
  if (meta) items.push({ label: "Meta Ads", cost: meta.cost, convs: meta.conversions });

  const W = 520;
  const ROW_H = 30;
  const PAD_L = 90;
  const PAD_R = 70;
  const barAreaW = W - PAD_L - PAD_R;
  const H = items.length * ROW_H * 2 + 26;

  const maxCost = Math.max(...items.map((x) => x.cost), 1);
  const maxConvs = Math.max(...items.map((x) => x.convs), 1);

  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>Distribución por publisher</Text>
      <Svg width={W} height={H}>
        {/* Header */}
        <Text
          x={PAD_L}
          y={14}
          style={{ fontSize: 7, color: COLORS.light, letterSpacing: 1 }}
        >
          COSTO Y CONVERSIONES
        </Text>

        {items.map((item, idx) => {
          const baseY = 20 + idx * ROW_H * 2;
          const costBarW = (item.cost / maxCost) * barAreaW;
          const convBarW = (item.convs / maxConvs) * barAreaW;
          return (
            <G key={idx} transform={`translate(0, ${baseY})`}>
              {/* Label publisher */}
              <Text x={0} y={10} style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.primary }}>
                {item.label}
              </Text>

              {/* Cost bar */}
              <Text x={0} y={26} style={{ fontSize: 7, color: COLORS.light, letterSpacing: 0.8 }}>
                COSTO
              </Text>
              <Rect x={PAD_L} y={18} width={barAreaW} height={10} fill={COLORS.cream} />
              <Rect x={PAD_L} y={18} width={costBarW} height={10} fill={COLORS.primary} />
              <Text
                x={PAD_L + barAreaW + 4}
                y={26}
                style={{ fontSize: 8, color: COLORS.primary, fontFamily: "Helvetica-Bold" }}
              >
                {formatShortCurrency(item.cost)}
              </Text>

              {/* Conversion bar */}
              <Text x={0} y={46} style={{ fontSize: 7, color: COLORS.light, letterSpacing: 0.8 }}>
                CONVERSIONES
              </Text>
              <Rect x={PAD_L} y={38} width={barAreaW} height={10} fill={COLORS.cream} />
              <Rect x={PAD_L} y={38} width={convBarW} height={10} fill={COLORS.accent} />
              <Text
                x={PAD_L + barAreaW + 4}
                y={46}
                style={{ fontSize: 8, color: COLORS.primary, fontFamily: "Helvetica-Bold" }}
              >
                {formatInt(item.convs)}
              </Text>
            </G>
          );
        })}
      </Svg>
      <Text style={{ fontSize: 7, color: COLORS.light, marginTop: 4 }}>
        Total: {formatShortCurrency(totals.cost)} · {formatInt(totals.conversions)} conversiones
      </Text>
    </View>
  );
}

// ---------- Top 5 campañas ----------

function TopCampaignsSection({ rows }: { rows: CampaignRow[] }) {
  if (rows.length === 0) return null;
  const top = [...rows].sort((a, b) => b.cost - a.cost).slice(0, 5);

  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>Top 5 campañas por costo</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: "40%" }]}>Campaña</Text>
        <Text style={[styles.th, { width: "12%" }]}>Pub</Text>
        <Text style={[styles.th, { width: "16%", textAlign: "right" }]}>Costo</Text>
        <Text style={[styles.th, { width: "16%", textAlign: "right" }]}>Convs</Text>
        <Text style={[styles.th, { width: "16%", textAlign: "right" }]}>CPA</Text>
      </View>
      {top.map((r, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.td, { width: "40%" }]}>{truncate(r.name, 38)}</Text>
          <Text style={[styles.tdMuted, { width: "12%" }]}>{publisherShort(r.publisher)}</Text>
          <Text style={[styles.td, { width: "16%", textAlign: "right" }]}>
            {formatShortCurrency(r.cost)}
          </Text>
          <Text style={[styles.td, { width: "16%", textAlign: "right" }]}>
            {formatInt(r.conversions)}
          </Text>
          <Text style={[styles.tdMuted, { width: "16%", textAlign: "right" }]}>
            {r.conversions > 0 ? formatShortCurrency(r.cpa) : "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------- Análisis de Claude ----------

function AnalysisSection({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

  return (
    <View break>
      <Text style={styles.sectionTitle}>Análisis y recomendaciones</Text>
      {blocks.map((block, i) => (
        <AnalysisBlock key={i} raw={block} />
      ))}
    </View>
  );
}

function AnalysisBlock({ raw }: { raw: string }) {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <View style={{ marginBottom: 8 }} wrap>
      {lines.map((line, idx) => (
        <AnalysisLine key={idx} line={line} />
      ))}
    </View>
  );
}

function AnalysisLine({ line }: { line: string }) {
  // Título tipo "**Título**" en una línea entera
  if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
    return <Text style={styles.analysisTitle}>{stripBold(line)}</Text>;
  }
  // Acción "→ ..."
  if (line.startsWith("→")) {
    return <Text style={styles.analysisAction}>{renderInlineToString(line)}</Text>;
  }
  // Bullet
  if (line.startsWith("- ") || line.startsWith("• ")) {
    return (
      <Text style={styles.analysisBody}>
        · {renderInlineToString(line.replace(/^[-•]\s+/, ""))}
      </Text>
    );
  }
  return <Text style={styles.analysisBody}>{renderInlineToString(line)}</Text>;
}

// ---------- Footer ----------

function Footer({ data }: { data: CoreyPdfData }) {
  return (
    <Text style={styles.footer} fixed>
      Generado: {formatTimestamp(data.generatedAt)} · {data.modelUsed}
    </Text>
  );
}

// ---------- Helpers ----------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
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

function formatInt(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function formatCurrency(n: number): string {
  return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n)}`;
}

function formatShortCurrency(n: number): string {
  // Para ejes de gráficos y filas tabla. Abreviamos sólo a partir de millones.
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$ ${(n / 1_000).toFixed(0)}k`;
  return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n)}`;
}

function formatDelta(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% vs período comparativo`;
}

function deltaColor(pct: number, invert?: boolean): string {
  if (pct === 0) return COLORS.light;
  const positive = pct > 0;
  if (invert) {
    // Para "Costo": más es peor.
    return positive ? COLORS.warning : COLORS.success;
  }
  return positive ? COLORS.success : COLORS.warning;
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

function publisherShort(p: string): string {
  if (p === "gads") return "GAds";
  if (p === "meta") return "Meta";
  return p;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function stripBold(line: string): string {
  return line.replace(/^\*\*/, "").replace(/\*\*$/, "");
}

/**
 * @react-pdf/renderer no soporta `<strong>` tag. Para mantener simple,
 * hacemos un "render plano" que saca los asteriscos. Si en el futuro
 * queremos negrita inline habría que mapear a hijos <Text bold>.
 */
function renderInlineToString(line: string): string {
  return line.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
}
