import { cn } from "@/lib/utils";

/**
 * Card base del cockpit "Control Room": superficie de acero con hairline
 * y, opcionalmente, el stripe plasma superior (`glow`).
 */
export function Panel({
  className,
  glow = false,
  children,
}: {
  className?: string;
  glow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "surface-card relative overflow-hidden rounded-xl p-4 sm:p-5",
        glow && "glow-stripe",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {sub && <p className="mt-0.5 text-[11px] text-light">{sub}</p>}
      </div>
      {right && (
        <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-light">
          {right}
        </div>
      )}
    </div>
  );
}
