import { PILLAR_BY_KEY, type PillarKey } from "@/lib/content/pillars";
import { cn } from "@/lib/utils";

// Color tenue por pilar, para que el feed se lea de un vistazo.
const PILLAR_CLASS: Record<PillarKey, string> = {
  panel_contexto: "bg-blue-50 text-blue-700 border-blue-200",
  calado_detalle: "bg-amber-50 text-amber-700 border-amber-200",
  luz_sombra: "bg-violet-50 text-violet-700 border-violet-200",
  proceso: "bg-slate-100 text-slate-700 border-slate-200",
  material: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function PillarBadge({ pillar }: { pillar: PillarKey }) {
  const p = PILLAR_BY_KEY[pillar];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        PILLAR_CLASS[pillar],
      )}
    >
      {p?.label ?? pillar}
    </span>
  );
}
