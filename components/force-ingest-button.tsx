"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/tremor/button";

interface ApiResponse {
  ok: boolean;
  message: string;
  cooldownMinutesRemaining?: number;
  startedAt?: string;
  durationMs?: number;
}

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; durationMs?: number }
  | { kind: "error"; message: string; cooldownMin?: number };

/**
 * Botón para forzar una ingesta manual. Llama a /api/ingest/run.
 *
 * El cooldown lo valida el backend (10 min entre corridas). Si el server
 * rechaza por cooldown, mostramos cuántos minutos faltan. Si la ingesta
 * sale OK, refrescamos la página para que la tabla y los KPIs de freshness
 * muestren los datos nuevos.
 */
export function ForceIngestButton() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [, startTransition] = useTransition();

  const run = async () => {
    setState({ kind: "running" });

    try {
      const res = await fetch("/api/ingest/run", { method: "POST" });
      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.ok) {
        setState({
          kind: "error",
          message: json.message,
          cooldownMin: json.cooldownMinutesRemaining,
        });
        return;
      }

      setState({ kind: "ok", durationMs: json.durationMs });

      // Refresh server-side data (tabla de log, freshness panel, etc.)
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setState({
        kind: "error",
        message: (err as Error).message,
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        type="button"
        onClick={run}
        isLoading={state.kind === "running"}
        loadingText="Ingestando…"
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Forzar ingesta ahora
      </Button>

      <Status state={state} />
    </div>
  );
}

function Status({ state }: { state: State }) {
  if (state.kind === "idle") {
    return (
      <span className="text-[11px] uppercase tracking-[0.12em] text-light">
        Próxima automática: lunes 18:00 ART
      </span>
    );
  }

  if (state.kind === "running") {
    return (
      <span className="text-[11px] uppercase tracking-[0.12em] text-light">
        Esto puede tardar hasta 60 segundos…
      </span>
    );
  }

  if (state.kind === "ok") {
    const seconds = state.durationMs
      ? Math.round(state.durationMs / 1000)
      : null;
    return (
      <span className="text-[11px] uppercase tracking-[0.12em] text-success">
        Completada{seconds !== null ? ` en ${seconds}s` : ""}
      </span>
    );
  }

  // error
  return (
    <span className="text-[11px] uppercase tracking-[0.12em] text-warning">
      {state.cooldownMin !== undefined
        ? `Cooldown: esperá ${state.cooldownMin} ${state.cooldownMin === 1 ? "min" : "min"}`
        : state.message}
    </span>
  );
}
