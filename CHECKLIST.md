# CHECKLIST — Fase 8: Motor de contenido para redes

Estado vivo del branch. Spec: `docs/plasmart-fase8-motor-contenido.md`.
Todo el feature es **aditivo**: archivos/rutas/tablas nuevas, cero cambios a
lo existente. No se mergea a `main` hasta aprobación explícita.

Orden de trabajo: 8.0 → 8.1 → 8.2 → 8.3. **8.4 diferida** (placa de 24GB).

Leyenda: ✅ hecho · 🚧 en curso · ⏳ pendiente · ⏸️ diferido

---

## Fase 8.0 — Banco y preparación  🚧
- [ ] Carpetas `/plasmart-content/banco/` y `/videos/` creadas y compartidas
      con el Service Account *(manual, lo hace Mariano en Drive)*
- [ ] Imágenes de Instagram volcadas al banco *(manual)*
- [x] Migration aditiva: `content_image`, `content_post`, `render_job`,
      `worker_heartbeat` + enums + RLS (sólo tablas nuevas)
- [x] RPC `claim_render_job` (lock atómico de la cola)
- [ ] **Aplicar** la migration en la base del Preview (`supabase db reset`
      local primero) *(lo corre Mariano)*

## Fase 8.1 — Kit de movimientos y render base (8GB)  ✅
- [x] Kit de ladrillos Remotion parametrizable con tokens de marca
- [x] Recorte 9:16 de fotos horizontales sin bandas (cover + relleno borroso)
- [x] Parallax 2.5D vía máscara de profundidad (Depth Anything en la PC)
- [x] Caption flotante con scrim
- [x] Script de render `render_spec` + imagen → MP4 1080×1920
      (`render:sample` y `render:file`)
- [x] Integración Depth Anything con fallback 2D (`src/depth/`)
- [x] Smoke-test por CPU en el contenedor (MP4 + frame OK)
- [ ] **Aceptación final en la PC**: validar parallax real con fotos del banco
      en la placa de 8GB *(lo corre Mariano)*

## Fase 8.2 — Cerebro editorial + dirección de arte  🚧
- [x] Auto-análisis de imágenes con Claude vision (`/api/contenido/sync-banco`)
- [x] Calendario rotativo por pilares y pesos (`lib/content/pillars.ts`)
- [x] Director de arte: genera `render_spec` + caption (`lib/content/anthropic.ts`)
- [x] Ruta `/contenido` con botón "generar contenido" → crea `render_job`
- [x] Extras de UI: sincronizar banco, regenerar, marcar publicado, descartar,
      preview de video/imagen vía Drive, indicador online/offline del worker
- [ ] **Aceptación en el Preview** (mañana, con tablas + banco + envs)

## Fase 8.3 — Worker local y seguridad  🚧
- [ ] Servicio de polling en la PC (toma jobs pending)
- [ ] Lock + timeout en la cola
- [ ] Heartbeat a `worker_heartbeat`
- [ ] Sube el MP4 a Drive `/videos/`
- [ ] Arranque automático y auto-restart (PM2 / Task Scheduler)
- [ ] Indicador online/offline en la app
- [ ] (dev) Tailscale para acceso manual

## Fase 8.4 — Capa IA headless  ⏸️ (diferida a la 24GB)
- [ ] ComfyUI headless + Wan 2.2 14B
- [ ] Paso I2V opcional en el worker (el kit ya acepta `videoSrc`)

## Fase 8.5 — Refinamientos  ⏳
- [ ] Vista de calendario en la app (agendado / publicado / pendiente)
- [ ] Fuente Inter via `@remotion/google-fonts` en el worker (hoy cae a
      sans-serif del sistema si no está Inter)
- [ ] README del módulo worker pulido tras 8.3
- [x] Regenerar (otra foto del mismo pilar o que Claude redecida el spec) → *hecho en 8.2*
- [x] Marcar como publicado y descartar → *hecho en 8.2*

> El botón "regenerar" y "marcar publicado" salieron antes de tiempo en 8.2
> porque eran parte del flujo intuitivo de `/contenido`. Quedan acá listados
> como hechos para no perderlos del scope original.

---

## Decisiones tomadas

- **Rama:** `claude/intelligent-tesla-Q1i6k` (la de esta sesión web; parte de
  `main`). Aislamiento total: no se toca `main` ni código existente.
- **Modelo de Claude:** `claude-haiku-4-5` (default) para el motor de
  contenido — visión + JSON, barato. El dashboard sigue con Sonnet 4.6.
- **Director de arte:** Claude vuelve a mirar la foto cada vez que genera un
  post (no reusa el análisis del banco), para afinar el recorte 9:16. El
  auto-análisis del banco (`subject`, `orientation`, etc.) se hace una sola
  vez al ingerir la imagen y se reusa para el routing por pilar.
- **Salida de video:** Drive `/videos/` (el worker sube reusando el Service
  Account; `content_post.video_file_id` guarda el id de Drive). El video se
  sirve al navegador con streaming server-side via
  `GET /api/contenido/video/[id]`.
- **Render:** Remotion (en `/worker`, NUNCA a Vercel). Depth Anything corre
  en la PC; en la nube se valida sólo el path sin IA.
- **Ruta nueva:** `/contenido`, sin tocar el sidebar del AppShell (se entra
  por URL en el Preview). Auth ya cubierta por el middleware existente.
- **Mutaciones server-side:** `lib/supabase/admin.ts` (service role) bypassea
  RLS. Las policies de las 4 tablas nuevas son sólo de LECTURA para
  `@transfil.com.ar`; no hay policies de INSERT/UPDATE — todo entra por el
  service role en API routes que ya hicieron auth.

---

## Próxima sesión (fin de semana) — pickup points

### En la PC del taller (worker)

```bash
git pull
cd worker
npm install                  # baja Remotion + su Chrome headless
npm run render:sample        # → worker/out/sample.mp4 (smoke-test, ~30s)
```

Si querés probar parallax 2.5D real con fotos del banco:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r src/depth/requirements.txt
# en worker/.env: DEPTH_PYTHON_BIN=/ruta/al/worker/.venv/bin/python
npm run render:file -- ./mi-spec.json ./foto.jpg
```

Aceptación de 8.1 (lo de la 8GB): foto horizontal recortada a 9:16 sin
bandas, motion + caption en marca, parallax sutil con el depth real.

### En Drive y Supabase (preparación de 8.0)

1. Crear `/plasmart-content/banco/` y `/plasmart-content/videos/` y
   compartirlas con el Service Account (banco: lectura; videos: escritura
   para el worker).
2. Volcar las fotos de Instagram a `/banco/`.
3. Decidir si la migration va a la base actual o a un proyecto Supabase
   free APARTE para Preview (recomendado para riesgo cero).
4. `supabase db reset` local primero para verificar; después `supabase db push`
   al proyecto target.

### En Vercel (preparación de 8.2)

Setear las env nuevas SÓLO en environment **Preview** (no Production):
`DRIVE_FOLDER_BANCO`. Reusar `GOOGLE_SERVICE_ACCOUNT_JSON`, `ANTHROPIC_API_KEY`
y los `SUPABASE_*`. Detalle en `docs/fase8-contenido.md`.

### Próximo código (8.3 — el loop del worker)

Lo que falta para cerrar la cadena punta a punta. Lo armamos en
`worker/src/`:

- `config.ts` — parsea las env del worker (`WORKER_ID`, intervalos, Drive
  folders, Supabase, etc.).
- `supabase.ts` — cliente service-role + helpers de cola (`claim_render_job`
  rpc, mark done/error, recover stale, heartbeat upsert).
- `google-auth.ts` + `drive.ts` — auth Node (scope `drive`, lectura + escritura)
  y upload del MP4 a `/videos/`. Espeja `lib/google/` de la app pero con scope
  ampliado.
- `index.ts` — loop: heartbeat → `claim_render_job` → download imagen del
  banco → (depth si hay python) → `renderStory` → upload a Drive → marcar
  `content_post` como `rendered` con `video_file_id` y `rendered_at`.
- Arranque automático (PM2 en Linux/Mac, Task Scheduler en Windows) + Tailscale
  para acceso de dev (opcional).

### Cuando todo lo de arriba esté OK

- Aceptación de 8.2 en Preview: sincronizar banco, generar un post, verificar
  que aparece en `/contenido` con caption coherente.
- Aceptación de 8.3 end-to-end: con el worker corriendo en la PC, apretar
  Generar y ver el MP4 aparecer en la card al refrescar.
- Recién ahí evaluar el merge a `main`.
