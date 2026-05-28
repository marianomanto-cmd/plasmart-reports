# Worker de render — Motor de contenido (Fase 8)

Proceso **local** que corre en la PC con GPU del taller. Toma fotos del banco
y, ejecutando el `render_spec` que decide Claude (director de arte), produce
IG Stories/Reels en MP4 9:16 con motion graphics de marca.

> **No se deploya a Vercel.** Vive en este branch sólo para versionarlo; se
> ejecuta a mano (o como servicio) en la PC. Es **outbound-only**: hace
> polling a Supabase, nunca abre puertos ni recibe conexiones.

Mapa de docs del feature:

- **`docs/plasmart-fase8-motor-contenido.md`** — la spec completa del motor.
- **`docs/fase8-contenido.md`** — setup operativo (Drive, migration, envs de
  Vercel) y cómo funciona `/contenido`.
- **`../CHECKLIST.md`** — estado vivo del branch y handoff entre sesiones.
- **este README** — todo lo que vive en la PC del taller.

## Estado por sub-fase

- **8.1 — Kit Remotion + render base ✅** (este commit). Renderiza un
  `render_spec` + imagen → MP4 1080×1920. Parallax 2.5D con Depth Anything.
- **8.3 — Worker + polling** ⏳ (próximo): loop que toma `render_job` de
  Supabase, renderiza y sube el MP4 a Drive.
- **8.4 — Capa IA (ComfyUI/Wan)** — diferida a la placa de 24GB. El kit ya
  acepta un `videoSrc` (clip I2V) como fuente; falta el paso de ComfyUI.

## Setup en la PC

```bash
cd worker
npm install            # baja Remotion + su Chrome headless
cp .env.example .env    # completá los valores (ver abajo)
```

Para el parallax 2.5D (opcional pero recomendado), instalá Depth Anything en
un venv de Python y apuntá `DEPTH_PYTHON_BIN` al intérprete:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r src/depth/requirements.txt
# en .env: DEPTH_PYTHON_BIN=/ruta/al/worker/.venv/bin/python
```

## Probar el render (8.1)

**Smoke-test sin foto real** (genera una imagen sintética y renderiza):

```bash
npm run render:sample
# → out/sample.mp4
```

**Con una foto real del banco** y un `render_spec` a mano:

```bash
npm run render:file -- ./mi-spec.json ./foto.jpg
# depth automático si DEPTH_PYTHON_BIN está seteado; si no, parallax 2D.
# salida: out/<foto>.mp4
```

Ejemplo de `render_spec.json`:

```json
{
  "crop": { "target": "panel", "rect_9x16": [0.5, 0.05, 0.42, 0.9], "background_fill": "blur_extend" },
  "movement": { "type": "push_in", "direction": "center", "parallax_intensity": 0.7, "duration_s": 10 },
  "caption": { "text": "Celosía 'Helecho' en corten", "position": "lower_left", "avoid_subject": true },
  "use_ai_i2v": false
}
```

**Preview interactivo de los ladrillos** (Remotion Studio):

```bash
npm run studio
```

## El kit de ladrillos (`remotion/`)

Se construye **una sola vez** y no se toca más. Claude no elige plantillas:
arma cada video parametrizando estos ladrillos vía el `render_spec`.

| Archivo | Qué hace |
|---|---|
| `tokens.ts` | Tokens de marca del video (negro/cobre/crema, Inter). |
| `types.ts` | Tipo `RenderSpec` + `normalizeRenderSpec` (valida/clampa el JSON). |
| `motion.ts` | Matemática de movimiento (Ken Burns + parallax diferencial). |
| `bricks/CoverImage.tsx` | Recorte 9:16 "cover" + máscara de profundidad. |
| `bricks/Caption.tsx` | Caption flotante + scrim de legibilidad. |
| `PlasmartStory.tsx` | Composición que ensambla los ladrillos según el spec. |

### Cómo agregar un ladrillo

1. Creá el componente en `remotion/bricks/`.
2. Sumá el/los campo(s) que lo parametricen en `RenderSpec` (`types.ts`) y su
   default + clamp en `normalizeRenderSpec`.
3. Usalo en `PlasmartStory.tsx`.
4. Actualizá el prompt del director de arte (Fase 8.2) para que Claude sepa
   que puede pedirlo.

## Notas

- En la PC, Remotion descarga su propio Chrome headless solo. En entornos sin
  acceso a esa descarga se puede apuntar a un binario con la env
  `CHROME_HEADLESS_SHELL`.
- `out/` y los assets generados están en `.gitignore`: nunca se commitean.
