import { RiEyeLine, RiCursorLine, RiFocus3Line } from "@remixicon/react";
import type { DashboardKpis } from "@/lib/types";
import { formatInteger, formatRatioAsPct } from "@/lib/format";

/**
 * Columna de mini-stats del Resumen: Impresiones, Clics y CTR. Cada fila
 * es una card glass chica con ícono en chip de color + valor + label.
 */
export function MiniStats({ kpis }: { kpis: DashboardKpis }) {
  const ctr =
    kpis.impressions.current > 0
      ? kpis.clicks.current / kpis.impressions.current
      : 0;

  const items = [
    {
      icon: RiEyeLine,
      value: formatInteger(kpis.impressions.current),
      label: "Impresiones",
    },
    {
      icon: RiCursorLine,
      value: formatInteger(kpis.clicks.current),
      label: "Clics",
    },
    {
      icon: RiFocus3Line,
      value: formatRatioAsPct(ctr),
      label: "CTR promedio",
    },
  ];

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="glass-soft flex flex-1 items-center gap-3 rounded-[20px] p-4"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(43,255,174,0.14)] text-[var(--color-gads)]">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="font-data text-xl font-extrabold leading-none text-foreground tabular-nums sm:text-2xl">
                {it.value}
              </div>
              <div className="mt-1 text-xs text-light">{it.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
