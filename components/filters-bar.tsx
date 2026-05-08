"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  AvailableFilters,
  CompareMode,
  DashboardFilters,
  Publisher,
} from "@/lib/types";
import { buildSearchString } from "@/lib/filters";

interface Props {
  filters: DashboardFilters;
  available: AvailableFilters;
}

/**
 * Barra de filtros sticky. Cualquier cambio reescribe la URL via router.replace,
 * lo que dispara un re-render del Server Component padre con datos nuevos.
 *
 * Cascada: cambiar publisher resetea type y campaign; cambiar type resetea campaign.
 */
export function FiltersBar({ filters, available }: Props) {
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

  // Las campañas mostradas dependen de los otros filtros activos
  const campaignOptions = useMemo(
    () =>
      available.campaigns
        .filter((c) => !filters.publisher || c.publisher === filters.publisher)
        .filter((c) => !filters.type || c.type === filters.type),
    [available.campaigns, filters.publisher, filters.type],
  );

  const hasActive = Boolean(filters.publisher || filters.type || filters.campaignId);

  return (
    <div className="sticky top-0 z-20 -mx-8 border-b border-border-default bg-cream/95 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
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
        />

        <div className="ml-auto flex items-center gap-3">
          {isPending && (
            <span className="text-[11px] uppercase tracking-[0.18em] text-light">
              Actualizando…
            </span>
          )}
          {hasActive && (
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
                border border-primary px-3 py-1.5
                text-[11px] font-semibold uppercase tracking-[0.18em] text-primary
                transition-colors duration-150 hover:bg-primary hover:text-white
              "
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Sub-componentes ----------

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
          focus:border-primary focus:outline-none
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
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
  minWidth?: number;
}) {
  return (
    <label className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ minWidth }}
        className="
          border border-border-default bg-white px-3 py-2
          text-sm font-medium text-primary
          focus:border-primary focus:outline-none
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
