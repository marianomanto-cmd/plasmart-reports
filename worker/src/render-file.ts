import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import { renderStory } from "./render.js";
import { fileToDataUrl } from "./util/image.js";
import { generateDepthMap } from "./depth/run-depth.js";

// CLI para renderizar un MP4 desde una foto real del banco + un render_spec.
// Pensado para probar 8.1 a mano en la PC con varias fotos/specs.
//
//   npm run render:file -- <render_spec.json> <imagen> [depth.png] [salida.mp4]
//
// Si no se pasa depth.png y DEPTH_PYTHON_BIN está seteado, se genera el depth
// map automáticamente con Depth Anything. Si no, cae a parallax 2D.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const [specPath, imagePath, maybeDepth, maybeOut] = process.argv.slice(2);
  if (!specPath || !imagePath) {
    console.error(
      "uso: npm run render:file -- <render_spec.json> <imagen> [depth.png] [salida.mp4]",
    );
    process.exit(2);
  }

  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const imageSrc = await fileToDataUrl(imagePath);

  // Depth: explícito por argumento, o auto-generado, o ninguno (2D).
  let depthPath = maybeDepth && !maybeDepth.endsWith(".mp4") ? maybeDepth : undefined;
  if (!depthPath) {
    const generated = await generateDepthMap(imagePath);
    if (generated) {
      depthPath = generated;
      console.log("Depth map generado:", generated);
    } else {
      console.log("Sin depth map → parallax 2D (seteá DEPTH_PYTHON_BIN para 2.5D).");
    }
  }
  const depthSrc = depthPath ? await fileToDataUrl(depthPath) : undefined;

  const outDir = path.join(__dirname, "..", "out");
  await mkdir(outDir, { recursive: true });
  const base = path.basename(imagePath, path.extname(imagePath));
  const outPath =
    maybeOut && maybeOut.endsWith(".mp4")
      ? maybeOut
      : maybeDepth && maybeDepth.endsWith(".mp4")
        ? maybeDepth
        : path.join(outDir, `${base}.mp4`);

  console.log("Renderizando →", outPath);
  await renderStory({
    spec,
    imageSrc,
    depthSrc,
    outPath,
    onProgress: (p) => process.stdout.write(`\r  progreso: ${(p * 100).toFixed(0)}%   `),
  });
  console.log("\nListo:", outPath);
}

main().catch((err) => {
  console.error("\nFalló el render:", err);
  process.exit(1);
});
