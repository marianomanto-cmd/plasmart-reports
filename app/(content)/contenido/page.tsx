import { RiImageLine } from "@remixicon/react";
import {
  getBancoStats,
  getWorkerStatus,
  listContentPosts,
} from "@/lib/content/queries";
import { ActionBar } from "./_components/action-bar";
import { PostCard } from "./_components/post-card";

export const dynamic = "force-dynamic";

export default async function ContenidoPage() {
  // Si las tablas todavía no existen (migration sin aplicar), mostramos un
  // aviso amable en vez de un 500.
  let data:
    | {
        posts: Awaited<ReturnType<typeof listContentPosts>>;
        banco: Awaited<ReturnType<typeof getBancoStats>>;
        worker: Awaited<ReturnType<typeof getWorkerStatus>>;
      }
    | null = null;
  let setupError: string | null = null;

  try {
    const [posts, banco, worker] = await Promise.all([
      listContentPosts(),
      getBancoStats(),
      getWorkerStatus(),
    ]);
    data = { posts, banco, worker };
  } catch (err) {
    setupError = (err as Error).message;
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-default bg-white p-6 text-sm text-steel">
        <p className="font-medium text-primary">Setup pendiente</p>
        <p className="mt-1">
          No se pudieron leer las tablas del motor de contenido. Verificá que la
          migration de la Fase 8 esté aplicada en la base.
        </p>
        <p className="mt-2 text-xs text-light">{setupError}</p>
      </div>
    );
  }

  const { posts, banco, worker } = data;
  const visible = posts.filter((p) => p.status !== "skipped");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-steel">
          Generá IG Stories/Reels a partir del banco de fotos. Claude decide el
          recorte, el movimiento y el texto; la PC del taller renderiza el MP4.
        </p>
      </div>

      <ActionBar
        banco={banco}
        worker={{ online: worker.online, gpuName: worker.worker?.gpu_name }}
      />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-default bg-white py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft">
            <RiImageLine className="size-6 text-brand" />
          </div>
          <p className="mt-4 font-medium text-primary">Todavía no hay contenido</p>
          <p className="mt-1 max-w-sm text-sm text-light">
            {banco.analyzed === 0
              ? "Empezá sincronizando el banco para traer las fotos de Drive."
              : 'Apretá "Generar contenido" para crear tu primer video.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
