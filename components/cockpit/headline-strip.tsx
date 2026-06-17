import {
  RiArrowRightUpLine,
  RiArrowRightDownLine,
  RiSubtractLine,
} from "@remixicon/react";
import type {
  CompareMode,
  DailyTotalsPoint,
  DashboardKpis,
  Ga4Kpis,
} from "@/lib/types";
import { formatCurrencyArs, formatDeltaPct, formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/sparkline";
import { Panel } from "./panel";

interface Props {
  kpis: DashboardKpis;
  ga4: Ga4Kpis;
  daily: DailyTotalsPoint[];
  compareMode: CompareMode;
}

/**
 * Tira de KPIs cabecera del cockpit: inversión, consultas (conversiones),
 * costo por consulta (CPA blended) y sesiones GA4. Numerales en mono.
 */
export function HeadlineStrip({ kpis, ga4, daily, compareMode }: Props) {
  const showDelta = compareMode !== "none";
  const costSeries = daily.map((d) => d.cost);
  const convSeries = daily.map((d) => d.conversions);
  const cpaSeries = daily.map((d) =>
    d.conversions > 0 ? d.cost / d.conversions : 0,
  );

  const cpaCurrent =
    kpis.conversions.current > 0
      ? kpis.cost.current / kpis.conversions.current
      : null;
  const cpaPrev =
    kpis.cost.previous !== null &&
    kpis.conversions.previous !== null &&
    kpis.conversions.previous > 0
      ? kpis.cost.previous / kpis.conversions.previous
      : null;
  const cpaDelta =
    cpaCurrent !== null && cpaPrev !== null && cpaPrev !== 0
      ? ((cpaCurrent - cpaPrev) / cpaPrev) * 100
      : null;

  const bounce = ga4.bounceRate.current;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        glow
        label="Inversión total"
        value={formatCurrencyArs(kpis.cost.current)}
        deltaPct={showDelta ? kpis.cost.deltaPct : null}
        tone="neutral"
        series={costSeries}
        color="#2bffae"
      />
      <Tile
        label="Consultas WhatsApp"
        value={formatInteger(kpis.conversions.current)}
        deltaPct={showDelta ? kpis.conversions.deltaPct : null}
        positiveIsGood
        series={convSeries}
        color="#34ffb0"
      />
      <Tile
        label="Costo por consulta"
        value={cpaCurrent !== null ? formatCurrencyArs(cpaCurrent) : "—"}
        deltaPct={showDelta ? cpaDelta : null}
        positiveIsGood={false}
        series={cpaSeries}
        color="#b6ff3d"
      />
      <Tile
        label="Sesiones GA4"
        value={formatInteger(ga4.sessions.current)}
        deltaPct={showDelta ? ga4.sessions.deltaPct : null}
        positiveIsGood
        note={`rebote ${Math.round(bounce * 100)}%`}
        color="#5cffc8"
      />
    </div>
  );
}

function Tile({
  label,
  value,
  deltaPct,
  positiveIsGood = true,
  tone = "auto",
  series,
  color,
  note,
  glow = false,
}: {
  label: string;
  value: string;
  deltaPct: number | null;
  positiveIsGood?: boolean;
  tone?: "auto" | "neutral";
  series?: number[];
  color?: string;
  note?: string;
  glow?: boolean;
}) {
  const flat = deltaPct === null || deltaPct === 0;
  const up = deltaPct !== null && deltaPct > 0;
  const favorable = flat ? null : up ? positiveIsGood : !positiveIsGood;

  const deltaColor =
    tone === "neutral" || favorable === null
      ? "text-steel"
      : favorable
        ? "text-success"
        : "text-warning";

  const Icon = flat
    ? RiSubtractLine
    : up
      ? RiArrowRightUpLine
      : RiArrowRightDownLine;

  return (
    <Panel glow={glow} className="flex min-h-[124px] flex-col gap-2">
      <div className="eyebrow-xs">{label}</div>
      <div className="font-data text-[24px] font-semibold leading-none tracking-tight text-foreground sm:text-[30px]">
        {value}
      </div>
      {series && series.length >= 2 && (
        <div className="mt-1">
          <Sparkline values={series} color={color} highlightLast showBaseline />
        </div>
      )}
      <div className="mt-auto flex items-center gap-1.5 text-xs">
        {deltaPct !== null ? (
          <span className={cn("flex items-center gap-1.5", deltaColor)}>
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="font-data font-semibold">
              {formatDeltaPct(deltaPct)}
            </span>
          </span>
        ) : (
          <span className="text-light">{note ? "" : "—"}</span>
        )}
        {note && <span className="text-light">{note}</span>}
      </div>
    </Panel>
  );
}
