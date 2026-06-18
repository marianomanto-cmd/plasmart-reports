import { parseIsoDate, toIsoDate, todayIso } from "@/lib/dates";
import { Panel } from "./panel";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Mini-calendario de la semana actual (Lun→Dom) con el día de hoy en
 * neón. Decorativo: ubica el período en el calendario.
 */
export function WeekCalendar() {
  const todayStr = todayIso();
  const today = parseIsoDate(todayStr);
  const dow = today.getUTCDay(); // 0=Dom..6=Sáb
  const mondayOffset = dow === 0 ? -6 : 1 - dow;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + mondayOffset + i);
    return d;
  });

  const monthLabel = `${MONTHS[today.getUTCMonth()]} ${today.getUTCFullYear()}`;

  return (
    <Panel>
      <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
        {monthLabel}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((l) => (
          <div key={l} className="pb-1 text-[10px] text-light">
            {l}
          </div>
        ))}
        {days.map((d) => {
          const isToday = toIsoDate(d) === todayStr;
          return (
            <div
              key={toIsoDate(d)}
              className={
                isToday
                  ? "neon-gradient mx-auto flex size-8 items-center justify-center rounded-lg font-data text-sm font-bold tabular-nums"
                  : "mx-auto flex size-8 items-center justify-center font-data text-sm tabular-nums text-steel"
              }
              aria-current={isToday ? "date" : undefined}
            >
              {d.getUTCDate()}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
