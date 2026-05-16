"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RiCloseLine } from "@remixicon/react";
import type {
  AnalysisGranularity,
  AvailableFilters,
  CompareMode,
  DashboardFilters,
  Publisher,
} from "@/lib/types";
import { buildSearchString } from "@/lib/filters";
import { parseIsoDate, rangeDays, toIsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type RangeMode = "exact" | "period";

const PERIOD_MIN = 1;
const PERIOD_MAX = 365;
const PERIOD_PRESETS = [7, 14, 30, 60, 90, 180, 365] as const;

function subtractDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() - days);
  return toIsoDate(d);
}

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function formatDateShort(iso: string): string {
  return dateFmt.format(parseIsoDate(iso));
}

interface Props {
  filters: DashboardFilters;
  available: AvailableFilters;
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
export function FiltersBar({ filters, available }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [rangeMode, setRangeMode] = useState<RangeMode>("exact");

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

  const campaignOptions = useMemo(
    () =>
      available.campaigns
        .filter((c) => !filters.publisher || c.publisher === filters.publisher)
        .filter((c) => !filters.type || c.type === filters.type),
    [available.campaigns, filters.publisher, filters.type],
  );

  const hasActive = Boolean(
    filters.publisher ||
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
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <div
        className={cn(
          "grid gap-3 items-end",
          // Mobile 1, sm 2, md 3, lg 4 columnas
          "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        )}
      >
        <SelectField
          label="Rango"
          value={rangeMode}
          options={[
            { value: "exact", label: "Fechas exactas" },
            { value: "period", label: "Período" },
          ]}
          onChange={(v) => setRangeMode(v as RangeMode)}
        />

        {rangeMode === "exact" ? (
          <>
            <DateField
              label="Desde"
              value={filters.from}
              max={filters.to}
              onChange={(v) => update({ from: v })}
            />
            <DateField
              label="Hasta"
              value={filters.to}
              min={filters.from}
              onChange={(v) => update({ to: v })}
            />
          </>
        ) : (
          <div className="sm:col-span-2 md:col-span-2 lg:col-span-2">
            <PeriodSlider
              from={filters.from}
              to={filters.to}
              onCommit={(newFrom) => update({ from: newFrom })}
            />
          </div>
        )}

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

        <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
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
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {filters.publisher && (
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
                  publisher: undefined,
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

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-9 w-full min-w-0 rounded-md border border-border bg-background px-2.5
          text-sm text-foreground tabular-nums
          focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20
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

function PeriodSlider({
  from,
  to,
  onCommit,
}: {
  from: string;
  to: string;
  onCommit: (newFrom: string) => void;
}) {
  const currentDays = Math.min(
    Math.max(rangeDays(from, to), PERIOD_MIN),
    PERIOD_MAX,
  );
  const [draftDays, setDraftDays] = useState<number | null>(null);
  const days = draftDays ?? currentDays;
  const previewFrom = subtractDays(to, days - 1);

  const commit = () => {
    if (draftDays === null) return;
    const newFrom = subtractDays(to, draftDays - 1);
    setDraftDays(null);
    if (newFrom !== from) onCommit(newFrom);
  };

  const presetsListId = "period-presets";

  return (
    <label className="flex flex-col">
      <FieldLabel>Período</FieldLabel>
      <div className="flex h-9 items-center gap-3 rounded-md border border-border bg-background px-2.5">
        <input
          type="range"
          min={PERIOD_MIN}
          max={PERIOD_MAX}
          step={1}
          value={days}
          list={presetsListId}
          onChange={(e) => setDraftDays(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          className="min-w-0 flex-1 accent-[#2563eb]"
          aria-label="Cantidad de días del período"
        />
        <datalist id={presetsListId}>
          {PERIOD_PRESETS.map((p) => (
            <option key={p} value={p} label={`${p}`} />
          ))}
        </datalist>
        <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-foreground">
          {days}d
        </span>
        <span className="hidden whitespace-nowrap text-[10px] tabular-nums text-muted-foreground sm:inline">
          {formatDateShort(previewFrom)} → {formatDateShort(to)}
        </span>
      </div>
    </label>
  );
}
