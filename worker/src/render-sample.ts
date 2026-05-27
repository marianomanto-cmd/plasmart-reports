import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { renderStory } from "./render.js";
import type { RenderSpec } from "../remotion/types.js";

// Smoke-test del kit SIN foto real ni GPU: genera una "foto" horizontal
// sintética (panel corten calado sobre fondo claro) + su depth map, y
// renderiza un MP4. Sirve para validar recorte 9:16, relleno de fondo,
// Ken Burns, parallax (con depth) y caption. El parallax real con Depth
// Anything se valida en la PC con fotos del banco.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// "Foto" 1600×900 (horizontal a propósito, para probar el recorte vertical).
function syntheticPhoto(): string {
  const holes: string[] = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 4; c++) {
      const cx = 980 + c * 130;
      const cy = 180 + r * 100;
      holes.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="34" ry="58" fill="#EDE7DC"/>`,
      );
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F5F0E8"/>
        <stop offset="1" stop-color="#DED6C9"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#bg)"/>
    <rect x="120" y="640" width="1360" height="60" fill="#C9BDA8" opacity="0.5"/>
    <rect x="900" y="120" width="560" height="660" rx="10" fill="#9C5B2E"/>
    <rect x="900" y="120" width="560" height="660" rx="10" fill="#7C4423" opacity="0.35"/>
    ${holes.join("")}
    <rect x="640" y="180" width="220" height="600" fill="#1A1A1A" opacity="0.06"/>
  </svg>`;
  return svgDataUrl(svg);
}

// Depth map alineado: panel = claro (cerca), fondo = oscuro (lejos).
function syntheticDepth(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
    <defs>
      <linearGradient id="d" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#1c1c1c"/>
        <stop offset="0.55" stop-color="#3a3a3a"/>
        <stop offset="1" stop-color="#555"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#d)"/>
    <rect x="900" y="120" width="560" height="660" rx="10" fill="#EAEAEA"/>
  </svg>`;
  return svgDataUrl(svg);
}

const sampleSpec: RenderSpec = {
  crop: {
    target: "panel",
    // Enfoca el panel (lado derecho de la foto horizontal) → sin bandas.
    rect_9x16: [0.5, 0.05, 0.42, 0.9],
    background_fill: "blur_extend",
  },
  movement: {
    type: "push_in",
    direction: "center",
    parallax_intensity: 0.7,
    duration_s: 10,
  },
  caption: {
    text: "Celosía 'Helecho' en corten",
    position: "lower_left",
    avoid_subject: true,
  },
  use_ai_i2v: false,
};

async function main() {
  const outDir = path.join(__dirname, "..", "out");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "sample.mp4");

  console.log("Renderizando smoke-test → ", outPath);
  await renderStory({
    spec: sampleSpec,
    imageSrc: syntheticPhoto(),
    depthSrc: syntheticDepth(),
    outPath,
    onProgress: (p) => {
      process.stdout.write(`\r  progreso: ${(p * 100).toFixed(0)}%   `);
    },
  });
  console.log("\nListo:", outPath);
}

main().catch((err) => {
  console.error("\nFalló el render de prueba:", err);
  process.exit(1);
});
