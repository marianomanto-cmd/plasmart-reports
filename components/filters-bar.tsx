"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RiCalendarLine, RiFilter3Line, RiCloseLine } from "@remixicon/react";
import type {
  AvailableFilters,
  CompareMode,
  DashboardFilters,
  Publisher,
} from "@/lib/types";
import { buildSearchString } from "@/lib/filters";
import { parseIsoDate, rangeDays, toIsoDate } from "@/lib/dates";

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
 * Barra de filtros sticky. Cualquier cambio reescribe la URL via router.replace,
 * lo que dispara un re-render del Server Component padre con datos nuevos.
 *
 * Cascada: cambiar publisher resetea type y campaign; cambiar type resetea campaign.
 *
 * Layout: dos grupos visuales separados por un divisor:
 *   - Rango temporal: tipo de rango, fechas (o slider) y comparación.
 *   - Scope: publisher, tipo, campaña.
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

  // Las campañas mostradas dependen de los otros filtros activos
  const campaignOptions = useMemo(
    () =>
      available.campaigns
        .filter((c) => !filters.publisher || c.publisher === filters.publisher)
        .filter((c) => !filters.type || c.type === filters.type),
    [available.campaigns, filters.publisher, filters.type],
  );

  const hasActive = Boolean(filters.publisher || filters.type || filters.campaignId);

  // Para mostrar el chip de campaña con su nombre amigable
  const activeCampaignName = useMemo(() => {
    if (!filters.campaignId) return null;
    return (
      available.campaigns.find((c) => c.id === filters.campaignId)?.name ??
      null
    );
  }, [available.campaigns, filters.campaignId]);

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border-default bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80 sm:-mx-8">
      <div className="px-4 py-4 sm:px-8">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 filters-bar-row">
          {/* ----- Grupo 1: rango temporal ----- */}
          <GroupLabel icon={<RiCalendarLine className="size-3.5" />}>
            Rango
          </GroupLabel>

          <SelectField
            label="Tipo de rango"
            value={rangeMode}
            options={[
              { value: "exact", label: "Fechas exactas" },
              { value: "period", label: "Período" },
            ]}
            onChange={(v) => setRangeMode(v as RangeMode)}
            minWidth={150}
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
            <PeriodSlider
              from={filters.from}
              to={filters.to}
              onCommit={(newFrom) => update({ from: newFrom })}
            />
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
            minWidth={170}
          />

          {/* Divisor vertical entre grupos. En mobile la barra ocupa
              full-width y el divisor estorba; lo escondemos abajo de sm. */}
          <span
            aria-hidden="true"
            className="hidden h-10 w-px bg-border-default sm:block"
          />

          {/* ----- Grupo 2: scope ----- */}
          <GroupLabel icon={<RiFilter3Line className="size-3.5" />}>
            Scope
          </GroupLabel>

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
            mobileFullWidth
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
            minWidth={150}
            mobileFullWidth
          />

          <SelectField
            label="Campaña"
            value={filters.campaignId ?? ""}
            options={[
              { value: "", label: "Todas" },
              ...campaignOptions.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(v) => update({ campaignId: v || undefined })}
            minWidth={260}
            mobileFullWidth
          />

          <div className="ml-auto flex items-center gap-3">
            {isPending && (
              <span className="text-[11px] uppercase tracking-[0.16em] text-light">
                Actualizando…
              </span>
            )}
          </div>
        </div>

        {/* ----- Chips de filtros activos + botón limpiar ----- */}
        {hasActive && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {filters.publisher && (
              <FilterChip
                label={
                  filters.publisher === "gads" ? "Google Ads" : "Meta Ads"
                }
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
            <button
              type="button"
              onClick={() =>
                update({
                  publisher: undefined,
                  type: undefined,
                  campaignId: undefined,
                })
              }
              className="
                ml-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-steel
                transition-colors duration-150 hover:text-primary
              "
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Sub-componentes ----------

function GroupLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className="hidden h-9 items-end gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-light sm:inline-flex"
    >
      {icon}
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-light">
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
    <label className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="
          border border-border-default bg-white px-3 py-2
          text-sm text-primary tabular-nums
          focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
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
  minWidth = 160,
  mobileFullWidth = false,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
  minWidth?: number;
  mobileFullWidth?: boolean;
}) {
  return (
    <label
      className={`flex flex-col${mobileFullWidth ? " filter-select-mobile-full" : ""}`}
    >
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ minWidth }}
        className="
          border border-border-default bg-white px-3 py-2
          text-sm font-medium text-primary
          focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-primary">
      <span className={truncate ? "block max-w-[200px] truncate" : ""}>
        {label}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="
          rounded-full p-0.5 text-steel transition-colors duration-150
          hover:bg-white/60 hover:text-primary
        "
        aria-label={`Quitar filtro ${label}`}
      >
        <RiCloseLine className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/**
 * Slider para elegir un período en días, anclado a la fecha "Hasta" actual.
 * Mientras se arrastra, sólo actualiza el estado local (preview); commitea
 * el cambio a la URL en pointerup / keyup para evitar refetchs en cascada.
 */
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
      <div className="flex items-center gap-4 border border-border-default bg-white px-3 py-2">
        <div className="flex flex-col gap-0.5">
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
            className="w-full accent-[#2563eb] sm:w-[260px]"
            aria-label="Cantidad de días del período"
          />
          <datalist id={presetsListId}>
            {PERIOD_PRESETS.map((p) => (
              <option key={p} value={p} label={`${p}`} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-primary tabular-nums whitespace-nowrap">
            Últimos {days} {days === 1 ? "día" : "días"}
          </span>
          <span className="text-[11px] text-light tabular-nums whitespace-nowrap">
            {formatDateShort(previewFrom)} — {formatDateShort(to)}
          </span>
        </div>
      </div>
    </label>
  );
}
