import type { CompareMode, DashboardKpis } from "@/lib/types";
import {
  formatCurrencyArs,
  formatInteger,
  formatRatioAsPct,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "none";

interface Tile {
  eyebrow: string;
  value: string;
  tone: Tone;
  delta: string | null;
  context: string;
}

function pct1(n: number): string {
  return `${Math.abs(n).toLocaleString("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function arrow(deltaPct: number | null): string {
  if (deltaPct === null || deltaPct === 0) return "→";
  return deltaPct > 0 ? "▲" : "▼";
}

/**
 * Tira de KPIs del Resumen (diseño Reactor Neon): Inversión, Consultas,
 * CPA (costo por consulta) y CTR. Cada card es glass con eyebrow, valor
 * grande y un pill de delta cuyo color refleja si el cambio es bueno.
 */
export function KpiStrip({
  kpis,
  compareMode,
}: {
  kpis: DashboardKpis;
  compareMode: CompareMode;
}) {
  const show = compareMode !== "none";

  // CPA = costo / consultas
  const cpa =
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
    cpa !== null && cpaPrev !== null && cpaPrev !== 0
      ? ((cpa - cpaPrev) / cpaPrev) * 100
      : null;

  // CTR = clics / impresiones (delta en puntos porcentuales)
  const ctr =
    kpis.impressions.current > 0
      ? kpis.clicks.current / kpis.impressions.current
      : 0;
  const ctrPrev =
    kpis.impressions.previous !== null && kpis.impressions.previous > 0
      ? (kpis.clicks.previous ?? 0) / kpis.impressions.previous
      : null;
  const ctrDeltaPp = ctrPrev !== null ? (ctr - ctrPrev) * 100 : null;

  const tone = (
    deltaPct: number | null,
    goodWhenUp: boolean,
    neutral = false,
  ): Tone => {
    if (!show || deltaPct === null || deltaPct === 0) return "none";
    if (neutral) return "warn";
    const up = deltaPct > 0;
    return up === goodWhenUp ? "ok" : "danger";
  };

  const tiles: Tile[] = [
    {
      eyebrow: "Inversión",
      value: formatCurrencyArs(kpis.cost.current),
      tone: tone(show ? kpis.cost.deltaPct : null, false, true),
      delta:
        show && kpis.cost.deltaPct !== null
          ? `${arrow(kpis.cost.deltaPct)} ${pct1(kpis.cost.deltaPct)}`
          : null,
      context: "vs período previo",
    },
    {
      eyebrow: "Consultas",
      value: formatInteger(kpis.conversions.current),
      tone: tone(show ? kpis.conversions.deltaPct : null, true),
      delta:
        show && kpis.conversions.deltaPct !== null
          ? `${arrow(kpis.conversions.deltaPct)} ${pct1(kpis.conversions.deltaPct)}`
          : null,
      context: "WhatsApp + Messenger",
    },
    {
      eyebrow: "CPA · costo/consulta",
      value: cpa !== null ? formatCurrencyArs(cpa) : "—",
      tone: tone(cpaDelta, false),
      delta: cpaDelta !== null ? `${arrow(cpaDelta)} ${pct1(cpaDelta)}` : null,
      context: cpaDelta !== null && cpaDelta < 0 ? "mejor" : "peor",
    },
    {
      eyebrow: "CTR",
      value: formatRatioAsPct(ctr),
      tone:
        !show || ctrDeltaPp === null || ctrDeltaPp === 0
          ? "none"
          : ctrDeltaPp > 0
            ? "ok"
            : "danger",
      delta:
        ctrDeltaPp !== null && ctrDeltaPp !== 0
          ? `${arrow(ctrDeltaPp)} ${Math.abs(ctrDeltaPp).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}pp`
          : null,
      context: `${formatInteger(kpis.clicks.current)} clics`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t, i) => (
        <div
          key={t.eyebrow}
          className="glass-soft an-pop rounded-[22px] p-4 sm:p-5"
          style={{ animationDelay: `${0.02 + i * 0.06}s` }}
        >
          <div className="eyebrow-xs">{t.eyebrow}</div>
          <div className="mt-2 font-data text-[26px] font-extrabold leading-none tracking-tight text-foreground tabular-nums sm:text-[30px]">
            {t.value}
          </div>
          {t.delta ? (
            <div className="mt-2.5">
              <span
                className={cn(
                  "pill",
                  t.tone === "ok" && "pill-ok",
                  t.tone === "warn" && "pill-warn",
                  t.tone === "danger" && "pill-danger",
                  t.tone === "none" &&
                    "border-border bg-white/5 text-steel",
                )}
              >
                {t.delta}
                <span className="font-medium text-light">{t.context}</span>
              </span>
            </div>
          ) : (
            <div className="mt-2.5 text-[11px] text-light">{t.context}</div>
          )}
        </div>
      ))}
    </div>
  );
}
