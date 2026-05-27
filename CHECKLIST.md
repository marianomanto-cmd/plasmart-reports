# CHECKLIST — Fase 8: Motor de contenido para redes

Estado vivo del branch. Spec: `plasmart-fase8-motor-contenido.md`.
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
- [ ] Vista de calendario en la app
- [ ] Botón "regenerar"
- [ ] Marcar como publicado
- [x] README del módulo worker (parcial; se completa con 8.3)

---

## Decisiones tomadas
- **Rama:** `claude/intelligent-tesla-Q1i6k` (la de esta sesión web; parte de
  `main`). Aislamiento total: no se toca `main` ni código existente.
- **Salida de video:** Drive `/videos/` (el worker sube reusando el Service
  Account; `content_post.video_file_id` guarda el id de Drive).
- **Render:** Remotion (en `/worker`, nunca a Vercel). Depth Anything corre en
  la PC; en la nube se valida sólo el path sin IA.
- **Ruta nueva:** `/contenido`, sin tocar el sidebar del AppShell (se entra por
  URL en el Preview). Auth ya cubierta por el middleware existente.
