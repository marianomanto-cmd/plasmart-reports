"use client";

/**
 * Primitivos de formulario reutilizables — comparten estilo (border 1px,
 * bg-white, focus en primary) y geometría (label + control vertical).
 * Pensados para la barra de filtros y futuras pantallas que necesiten el
 * mismo lenguaje visual.
 */

interface SelectOption {
  value: string;
  label: string;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-light">
      {children}
    </span>
  );
}

export function DateField({
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

export function SelectField({
  label,
  value,
  options,
  onChange,
  minWidth = 160,
}: {
  label: string;
  value: string;
  options: SelectOption[];
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
