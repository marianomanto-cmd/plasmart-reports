#!/usr/bin/env python3
"""Genera un mapa de profundidad (depth map) con Depth Anything V2.

Corre en la PC del worker (no en la nube). Salida: PNG en escala de grises,
mismas dimensiones que la entrada, donde MÁS CLARO = MÁS CERCA. El kit de
Remotion usa ese PNG como máscara por luminancia para el parallax 2.5D.

Uso:
    python depth_anything.py <input_image> <output_png>

Modelo por defecto: depth-anything/Depth-Anything-V2-Small-hf (entra holgado
en 8GB de VRAM; corre incluso en CPU, más lento). Se puede sobreescribir con
la env var DEPTH_MODEL.
"""
import os
import sys


def main() -> int:
    if len(sys.argv) != 3:
        print("uso: depth_anything.py <input_image> <output_png>", file=sys.stderr)
        return 2

    input_path, output_path = sys.argv[1], sys.argv[2]

    try:
        import numpy as np
        import torch
        from PIL import Image
        from transformers import pipeline
    except ImportError as exc:  # pragma: no cover
        print(
            f"Faltan dependencias de Python: {exc}. "
            "Instalá con: pip install -r requirements.txt",
            file=sys.stderr,
        )
        return 3

    model = os.environ.get("DEPTH_MODEL", "depth-anything/Depth-Anything-V2-Small-hf")
    device = 0 if torch.cuda.is_available() else -1

    pipe = pipeline(task="depth-estimation", model=model, device=device)
    image = Image.open(input_path).convert("RGB")
    result = pipe(image)

    depth = np.array(result["depth"], dtype=np.float32)
    lo, hi = float(depth.min()), float(depth.max())
    if hi - lo < 1e-6:
        norm = np.zeros_like(depth)
    else:
        norm = (depth - lo) / (hi - lo)  # 0..1; cerca = alto en Depth Anything

    out = Image.fromarray((norm * 255.0).astype("uint8"), mode="L")
    out = out.resize(image.size)  # asegura mismas dimensiones que la foto
    out.save(output_path)
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
