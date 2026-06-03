import { RiAlarmWarningLine, RiCheckboxCircleLine } from "@remixicon/react";
import type { CockpitAlert, AlertSeverity } from "@/lib/insights";
import { Panel, PanelHead } from "./panel";

const TONE: Record<
  AlertSeverity,
  { bar: string; tag: string; glow: string }
> = {
  danger: {
    bar: "bg-danger",
    tag: "text-danger bg-danger/12",
    glow: "shadow-[0_0_10px_rgba(248,113,113,.5)]",
  },
  warn: {
    bar: "bg-warning",
    tag: "text-warning bg-warning/12",
    glow: "shadow-[0_0_10px_rgba(251,191,36,.4)]",
  },
  info: {
    bar: "bg-gads",
    tag: "text-gads bg-gads/12",
    glow: "shadow-[0_0_10px_rgba(56,189,248,.4)]",
  },
};

/**
 * Feed "Qué mirar": las anomalías de campaña convertidas en señales
 * accionables, ordenadas por severidad. El insight más valioso del
 * cockpit — antes vivía como badges de 9px dentro de una tabla.
 */
export function AlertFeed({ alerts }: { alerts: CockpitAlert[] }) {
  return (
    <Panel className="h-full">
      <PanelHead
        title="⚑ Qué mirar"
        sub="Generado de anomalías + mayores desvíos del período"
        right={
          alerts.length > 0
            ? `${alerts.length} ${alerts.length === 1 ? "señal" : "señales"}`
            : undefined
        }
      />

      {alerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface-2 px-4 py-6 text-sm text-steel">
          <RiCheckboxCircleLine
            className="size-5 shrink-0 text-success"
            aria-hidden="true"
          />
          Sin señales en el período. Ninguna campaña en aprendizaje, con CPC
          disparado ni con gasto desproporcionado.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {alerts.map((a) => {
            const tone = TONE[a.severity];
            return (
              <li
                key={a.id}
                className="flex gap-3 rounded-lg border border-border-soft bg-surface-2 p-3"
              >
                <span
                  aria-hidden="true"
                  className={`w-[3px] shrink-0 self-stretch rounded-full ${tone.bar} ${tone.glow}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiAlarmWarningLine
                      className="size-3.5 shrink-0 text-light"
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-semibold text-foreground">
                      {a.title}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${tone.tag}`}
                    >
                      {a.tag}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-light">
                    {a.meta}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-steel">
                    {a.body}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-brand">
                    → {a.action}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
