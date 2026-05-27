import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

/**
 * Lee una imagen del disco y la devuelve como data URL, lista para pasarla
 * a Remotion vía inputProps. Simple y portable (no requiere servir archivos).
 * Para bancos grandes se podría servir vía un static dir; alcanza así por ahora.
 */
export async function fileToDataUrl(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    throw new Error(`Extensión de imagen no soportada: ${ext} (${filePath})`);
  }
  const buf = await readFile(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}
