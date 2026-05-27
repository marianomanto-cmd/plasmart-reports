import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { normalizeRenderSpec, type RenderSpec } from "../remotion/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(__dirname, "..", "remotion", "index.ts");
const COMPOSITION_ID = "PlasmartStory";

// El bundle de Remotion se arma una sola vez por proceso y se reusa entre
// renders (el worker procesa muchos jobs sin re-bundlear).
let bundlePromise: Promise<string> | null = null;
function getServeUrl(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: ENTRY,
      // Sin override de webpack: la config default de Remotion alcanza.
    });
  }
  return bundlePromise;
}

export interface RenderInput {
  spec: RenderSpec | unknown;
  /** Imagen fuente: URL http(s) o data URL. */
  imageSrc: string;
  /** Depth map opcional para el parallax. */
  depthSrc?: string;
  /** Clip I2V opcional (Fase 8.4). */
  videoSrc?: string;
  /** Ruta absoluta del MP4 de salida. */
  outPath: string;
  onProgress?: (progress: number) => void;
}

/**
 * Renderiza un render_spec + imagen a un MP4 1080×1920 H.264.
 * Devuelve la ruta del archivo escrito.
 */
export async function renderStory(input: RenderInput): Promise<string> {
  const spec = normalizeRenderSpec(input.spec);
  const inputProps = {
    spec,
    imageSrc: input.imageSrc,
    depthSrc: input.depthSrc,
    videoSrc: input.videoSrc,
  };

  // En la PC, Remotion descarga su propio Chrome headless. En entornos sin
  // acceso a esa descarga (CI/contenedor), se puede apuntar a un binario ya
  // presente con CHROME_HEADLESS_SHELL. Vacío = comportamiento default.
  const browserExecutable = process.env.CHROME_HEADLESS_SHELL || undefined;

  const serveUrl = await getServeUrl();
  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps,
    browserExecutable,
  });

  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: input.outPath,
    inputProps,
    browserExecutable,
    onProgress: input.onProgress
      ? ({ progress }) => input.onProgress!(progress)
      : undefined,
  });

  return input.outPath;
}
