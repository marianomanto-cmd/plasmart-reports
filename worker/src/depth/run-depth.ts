import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "depth_anything.py");

/**
 * Genera el depth map de una imagen invocando el script de Depth Anything.
 * Devuelve la ruta del PNG generado, o `null` si no hay python configurado o
 * el proceso falla (el render cae a parallax 2D sin máscara).
 *
 * Requiere DEPTH_PYTHON_BIN apuntando al intérprete con las deps instaladas
 * (ver requirements.txt). Si no está seteado, devuelve null silenciosamente.
 */
export async function generateDepthMap(
  imagePath: string,
): Promise<string | null> {
  const python = process.env.DEPTH_PYTHON_BIN;
  if (!python) return null;

  const dir = await mkdtemp(path.join(tmpdir(), "plasmart-depth-"));
  const outPath = path.join(dir, "depth.png");

  return new Promise((resolve) => {
    const proc = spawn(python, [SCRIPT, imagePath, outPath], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => resolve(code === 0 ? outPath : null));
  });
}
