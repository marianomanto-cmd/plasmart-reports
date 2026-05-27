"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  RiDownloadLine,
  RiRefreshLine,
  RiCheckLine,
  RiCloseLine,
  RiTimeLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContentPostWithImage, ContentPostStatus } from "@/lib/content/types";
import { PillarBadge } from "./pillar-badge";

const STATUS_LABEL: Record<ContentPostStatus, string> = {
  draft: "En cola",
  rendered: "Listo",
  published: "Publicado",
  skipped: "Descartado",
};

const STATUS_CLASS: Record<ContentPostStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  rendered: "bg-blue-50 text-blue-700",
  published: "bg-emerald-50 text-emerald-700",
  skipped: "bg-slate-100 text-slate-400 line-through",
};

export function PostCard({ post }: { post: ContentPostWithImage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isReady =
    (post.status === "rendered" || post.status === "published") &&
    !!post.video_file_id;
  const videoUrl = `/api/contenido/video/${post.id}`;
  const imageUrl = post.image ? `/api/contenido/image/${post.image.id}` : null;

  const run = async (label: string, fn: () => Promise<Response>) => {
    setBusy(label);
    setError(null);
    try {
      const res = await fn();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Falló la acción");
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (status: ContentPostStatus) =>
    run(status, () =>
      fetch(`/api/contenido/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );

  const regenerate = (mode: "image" | "spec") =>
    run("regenerate", () =>
      fetch("/api/contenido/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, mode }),
      }),
    );

  const disabled = busy !== null || pending;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-default bg-white shadow-sm">
      {/* Preview 9:16 */}
      <div className="relative aspect-[9/16] bg-slate-900">
        {isReady ? (
          <video
            src={videoUrl}
            poster={imageUrl ?? undefined}
            controls
            preload="metadata"
            playsInline
            className="size-full object-cover"
          />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={post.caption ?? "Imagen del banco"}
            className="size-full object-cover opacity-80"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-light">
            sin imagen
          </div>
        )}
        {!isReady ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-slate-900/70 px-3 py-2 text-xs font-medium text-white">
            <RiTimeLine className="size-3.5" />
            {post.status === "skipped"
              ? "Descartado"
              : "En cola — se renderiza cuando la PC esté online"}
          </div>
        ) : null}
      </div>

      {/* Meta + acciones */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <PillarBadge pillar={post.pillar} />
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              STATUS_CLASS[post.status],
            )}
          >
            {STATUS_LABEL[post.status]}
          </span>
        </div>

        <p className="line-clamp-2 text-sm font-medium text-primary">
          {post.caption || "—"}
        </p>

        <p className="text-xs text-light">
          {new Date(post.created_at).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {isReady ? (
            <a href={`${videoUrl}?download=1`} download>
              <Button size="sm" variant="default" disabled={disabled}>
                <RiDownloadLine />
                Descargar
              </Button>
            </a>
          ) : null}

          {isReady && post.status !== "published" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => setStatus("published")}
            >
              <RiCheckLine />
              Marcar publicado
            </Button>
          ) : null}

          {post.status !== "skipped" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => regenerate("image")}
              title="Generar otra versión con otra foto del mismo pilar"
            >
              <RiRefreshLine />
              {busy === "regenerate" ? "Regenerando…" : "Regenerar"}
            </Button>
          ) : null}

          {post.status === "draft" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => setStatus("skipped")}
            >
              <RiCloseLine />
              Descartar
            </Button>
          ) : null}
        </div>

        {error ? <p className="text-xs text-warning">{error}</p> : null}
      </div>
    </div>
  );
}
