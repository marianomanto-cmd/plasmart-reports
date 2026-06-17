"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RiCalendarLine, RiCloseLine } from "@remixicon/react";
import type {
  AnalysisGranularity,
  AvailableFilters,
  CompareMode,
  DashboardFilters,
  Publisher,
} from "@/lib/types";
import { buildSearchString } from "@/lib/filters";
import {
  DATE_RANGE_PRESETS,
  matchDatePreset,
  parseIsoDate,
  rangeDays,
  todayIso,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

function formatDateShort(iso: string): string {
  return dateFmt.format(parseIsoDate(iso));
}

interface Props {
  filters: DashboardFilters;
  available: AvailableFilters;
  /** Si se setea, la vista ya está fijada a ese publisher (sub-rutas
   *  /paid/gads y /paid/meta): se oculta el selector de Publisher y se
   *  escopean las campañas a ese publisher. */
  lockedPublisher?: Publisher;
}

/**
 * Barra de filtros inline para usar al tope de cada página.
 * Cualquier cambio reescribe la URL via router.replace, lo que dispara
 * un re-render del Server Component padre con datos nuevos.
 *
 * Cascada: cambiar publisher resetea type y campaign; cambiar type
 * resetea campaign.
 *
 * Layout:
 *   - Mobile (<sm): stack vertical full-width.
 *   - Desktop (≥sm): grid responsive con auto-fit, todos los controles
 *     visibles sin scroll. Los chips de filtros activos van debajo.
 */
export function FiltersBar({ filters, available, lockedPublisher }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const update = (patch: Partial<DashboardFilters>) => {
    const next: DashboardFilters = { ...filters, ...patch };
    if (patch.publisher !== undefined && patch.publisher !== filters.publisher) {
      next.type = undefined;
      next.campaignId = undefined;
    }
    if (patch.type !== undefined && patch.type !== filters.type) {
      next.campaignId = undefined;
    }
    const qs = buildSearchString(next);
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  };

  const effectivePublisher = lockedPublisher ?? filters.publisher;

  const campaignOptions = useMemo(
    () =>
      available.campaigns
        .filter((c) => !effectivePublisher || c.publisher === effectivePublisher)
        .filter((c) => !filters.type || c.type === filters.type),
    [available.campaigns, effectivePublisher, filters.type],
  );

  const hasActive = Boolean(
    (!lockedPublisher && filters.publisher) ||
      filters.type ||
      filters.campaignId ||
      (filters.granularity && filters.granularity !== "campaign"),
  );

  const activeCampaignName = useMemo(() => {
    if (!filters.campaignId) return null;
    return (
      available.campaigns.find((c) => c.id === filters.campaignId)?.name ?? null
    );
  }, [available.campaigns, filters.campaignId]);

  return (
    <div className="glass space-y-3 rounded-[20px] p-3 sm:p-4">
      {/* Bloque de período: presets de un clic + fechas exactas */}
      <DateRangeField
        from={filters.from}
        to={filters.to}
        onChange={(from, to) => update({ from, to })}
      />

      <div
        className={cn(
          "grid gap-3 items-end",
          // Mobile 1, sm 2, lg 4 columnas
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        <SelectField
          label="Comparar contra"
          value={filters.compare}
          options={[
            { value: "previous", label: "Período anterior" },
            { value: "yoy", label: "Año anterior" },
            { value: "none", label: "Sin comparación" },
          ]}
          onChange={(v) => update({ compare: v as CompareMode })}
        />

        {!lockedPublisher && (
          <SelectField
            label="Publisher"
            value={filters.publisher ?? ""}
            options={[
              { value: "", label: "Todos" },
              { value: "gads", label: "Google Ads" },
              { value: "meta", label: "Meta Ads" },
            ]}
            onChange={(v) =>
              update({ publisher: v ? (v as Publisher) : undefined })
            }
          />
        )}

        <SelectField
          label="Granularidad"
          value={filters.granularity ?? "campaign"}
          options={[
            { value: "campaign", label: "Campañas" },
            { value: "adset", label: "Ad groups" },
            { value: "ad", label: "Ads" },
          ]}
          onChange={(v) =>
            update({ granularity: v as AnalysisGranularity })
          }
        />

        <SelectField
          label="Tipo"
          value={filters.type ?? ""}
          options={[
            { value: "", label: "Todos" },
            ...available.types.map((t) => ({
              value: t,
              label: t.replace(/_/g, " ").toUpperCase(),
            })),
          ]}
          onChange={(v) => update({ type: v || undefined })}
        />

        <div className="sm:col-span-2 lg:col-span-4">
          <SelectField
            label="Campaña"
            value={filters.campaignId ?? ""}
            options={[
              { value: "", label: "Todas" },
              ...campaignOptions.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(v) => update({ campaignId: v || undefined })}
          />
        </div>
      </div>

      {/* Chips de filtros activos + estado + limpiar */}
      {(hasActive || isPending) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {!lockedPublisher && filters.publisher && (
            <FilterChip
              label={filters.publisher === "gads" ? "Google Ads" : "Meta Ads"}
              onClear={() => update({ publisher: undefined })}
            />
          )}
          {filters.type && (
            <FilterChip
              label={filters.type.replace(/_/g, " ").toUpperCase()}
              onClear={() => update({ type: undefined })}
            />
          )}
          {filters.campaignId && (
            <FilterChip
              label={activeCampaignName ?? "Campaña"}
              onClear={() => update({ campaignId: undefined })}
              truncate
            />
          )}
          {filters.granularity && filters.granularity !== "campaign" && (
            <FilterChip
              label={
                filters.granularity === "adset" ? "Ad groups" : "Ads"
              }
              onClear={() => update({ granularity: "campaign" })}
            />
          )}
          {hasActive && (
            <button
              type="button"
              onClick={() =>
                update({
                  ...(lockedPublisher ? {} : { publisher: undefined }),
                  type: undefined,
                  campaignId: undefined,
                  granularity: "campaign",
                })
              }
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Limpiar
            </button>
          )}
          {isPending && (
            <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Actualizando…
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Sub-componentes ----------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </span>
  );
}

/**
 * Selector de período: presets de un clic (la ruta principal) + fechas
 * exactas para rangos custom + resumen en vivo del rango elegido.
 *
 * A diferencia del slider viejo (que sólo movía `from` y dejaba `to`
 * clavado en el pasado), cada preset setea `from` y `to` juntos, así que
 * "Últimos 30 días" siempre termina en hoy.
 */
function DateRangeField({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const activePreset = matchDatePreset(from, to);
  const today = todayIso();
  const days = rangeDays(from, to);

  return (
    <div className="rounded-md border border-border-soft bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel>Período</FieldLabel>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-steel">
          <RiCalendarLine className="size-3.5 text-light" aria-hidden="true" />
          <span className="font-data tabular-nums text-foreground">
            {formatDateShort(from)} → {formatDateShort(to)}
          </span>
          <span className="text-light">· {days}d</span>
        </span>
      </div>

      {/* Presets a la izquierda, fechas exactas a la derecha. En pantallas
          anchas comparten fila (hay lugar de sobra); en angostas stackean. */}
      <div className="mt-2.5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex flex-wrap gap-1.5">
          {DATE_RANGE_PRESETS.map((preset) => {
            const isActive = preset.key === activePreset;
            return (
              <button
                key={preset.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  const r = preset.range();
                  onChange(r.from, r.to);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  isActive
                    ? "border-brand/50 bg-brand-soft text-foreground"
                    : "border-border bg-card/40 text-steel hover:border-brand/40 hover:text-foreground",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Fechas exactas (para rangos custom) */}
        <div className="flex shrink-0 items-end gap-2">
          <DateField
            label="Desde"
            value={from}
            max={to}
            onChange={(v) => onChange(v, to)}
            className="min-w-0 flex-1 sm:w-36 sm:flex-none"
          />
          <DateField
            label="Hasta"
            value={to}
            min={from}
            max={today}
            onChange={(v) => onChange(from, v)}
            className="min-w-0 flex-1 sm:w-36 sm:flex-none"
          />
        </div>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
  className,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col", className)}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        // [color-scheme:dark] hace que el calendario nativo y su ícono
        // se rendericen en oscuro, alineados al tema Control Room.
        className="
          h-9 w-full min-w-0 rounded-md border border-border bg-background px-2.5
          text-sm text-foreground tabular-nums font-data [color-scheme:dark]
          focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20
          [&::-webkit-calendar-picker-indicator]:cursor-pointer
        "
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-9 w-full min-w-0 truncate rounded-md border border-border bg-background px-2.5
          text-sm font-medium text-foreground
          focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20
        "
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterChip({
  label,
  onClear,
  truncate = false,
}: {
  label: string;
  onClear: () => void;
  truncate?: boolean;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-0.5 text-[11px] font-medium text-foreground">
      <span className={truncate ? "block max-w-[140px] truncate" : ""}>
        {label}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground"
        aria-label={`Quitar filtro ${label}`}
      >
        <RiCloseLine className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}
