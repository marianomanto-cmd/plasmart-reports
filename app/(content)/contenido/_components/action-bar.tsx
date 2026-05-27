"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  RiSparkling2Line,
  RiRefreshLine,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  banco: { total: number; analyzed: number; pending: number };
  worker: { online: boolean; gpuName?: string | null };
}

type Msg = { kind: "ok" | "error"; text: string } | null;

export function ActionBar({ banco, worker }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "generate" | "sync">(null);
  const [msg, setMsg] = useState<Msg>(null);

  const call = async (
    which: "generate" | "sync",
    url: string,
  ) => {
    setBusy(which);
    setMsg(null);
    try {
      const res = await fetch(url, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ kind: "error", text: json.error ?? "Algo falló" });
      } else if (which === "sync") {
        setMsg({
          kind: "ok",
          text: `Banco sincronizado: ${json.added} nuevas, ${json.analyzed} analizadas${json.pending ? `, ${json.pending} por analizar (volvé a sincronizar)` : ""}.`,
        });
      } else {
        setMsg({ kind: "ok", text: `Contenido generado: "${json.caption}".` });
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-default bg-white p-5 shadow-sm">
      {/* Estado del worker + banco */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              "size-2.5 rounded-full",
              worker.online ? "bg-success" : "bg-light",
            )}
          />
          <span className="font-medium text-primary">
            PC de render: {worker.online ? "online" : "offline"}
          </span>
          {worker.online && worker.gpuName ? (
            <span className="text-light">({worker.gpuName})</span>
          ) : null}
        </span>
        <span className="text-steel">
          Banco: <strong className="text-primary">{banco.total}</strong> imágenes
          · {banco.analyzed} analizadas
          {banco.pending > 0 ? ` · ${banco.pending} pendientes` : ""}
        </span>
      </div>

      {!worker.online ? (
        <p className="mt-2 text-xs text-warning">
          La PC de render está apagada. Podés generar igual: los videos se
          renderizan cuando la prendas.
        </p>
      ) : null}

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => call("generate", "/api/contenido/generate")}
          disabled={busy !== null || pending}
        >
          <RiSparkling2Line />
          {busy === "generate" ? "Generando…" : "Generar contenido"}
        </Button>
        <Button
          variant="outline"
          onClick={() => call("sync", "/api/contenido/sync-banco")}
          disabled={busy !== null || pending}
        >
          <RiRefreshLine />
          {busy === "sync" ? "Sincronizando…" : "Sincronizar banco"}
        </Button>
      </div>

      {msg ? (
        <p
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 text-sm",
            msg.kind === "ok" ? "text-success" : "text-warning",
          )}
        >
          {msg.kind === "ok" ? (
            <RiCheckboxCircleFill className="size-4" />
          ) : (
            <RiErrorWarningFill className="size-4" />
          )}
          {msg.text}
        </p>
      ) : null}

      {/* Cómo funciona */}
      <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-soft pt-3 text-xs text-light">
        <li>1 · Sincronizá el banco (trae fotos nuevas de Drive)</li>
        <li>2 · Generá contenido (Claude arma el video)</li>
        <li>3 · La PC renderiza el MP4</li>
        <li>4 · Descargás, le ponés audio y publicás</li>
      </ol>
    </div>
  );
}
