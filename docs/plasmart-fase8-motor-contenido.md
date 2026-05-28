# PLASMART
## Fase 8 — Motor de contenido para redes
### Anexo al documento técnico de Reportería de Campañas

**Generación diaria de IG Stories / Reels a partir del banco de imágenes**
**Motion graphics locales · Claude como director de arte · IA opcional headless**

Versión 1.1 · Mayo 2026

> Cambios respecto a la v1.0: vos ya no elegís plantillas ni diseñás los
> videos. Claude analiza cada foto y decide solo qué hacer con ella (recorte,
> movimiento, caption, si usa IA). ComfyUI corre headless, nunca se abre la
> interfaz. Pilares afinados al contenido real del feed (paneles calados para
> arquitectura).

---

## Tabla de contenidos

1. Objetivo y alcance
2. La idea en una frase
3. Pilares de contenido
4. Arquitectura
5. El banco de imágenes en Drive
6. Modelo de datos (tablas nuevas)
7. El worker de render y la seguridad
8. Claude como director de arte
9. El cerebro editorial
10. GPU: hoy 8GB, en una semana 24GB
11. Costos
12. Desarrollo por sub-fases
13. Checklist

---

## 1. Objetivo y alcance

Sumarle al sistema de Plasmart un motor que, cada vez que apretás "generar
contenido", produzca una o dos IG Stories / Reels en formato video corto
(10-15 segundos, 9:16) a partir del banco de fotos que ya tenés —las mismas
que están en Instagram— volcadas a una carpeta de Google Drive. El video sale
listo para descargar desde cualquier celular o computadora, en silencio, para
que vos le agregues el audio trending desde IG o TikTok y lo publiques.

La parte clave: **vos no diseñás ni elegís nada**. La IA reconoce sola qué
conviene hacer con cada imagen y arma el video. Apretás un botón y listo.

### Lo que NO está en alcance

- Publicación automática en redes (vos publicás a mano, eligiendo el audio).
- Generación de música o voz (el audio se agrega en IG/TikTok).
- Edición manual de video o interacción con ninguna interfaz de render (la app
  entrega el MP4 terminado; ComfyUI es invisible).
- Generación de imágenes desde cero con IA (se usan siempre fotos reales del
  banco).

---

## 2. La idea en una frase

No es "una IA que inventa videos de corte láser". Es **animar tus fotos reales
con motion graphics, dejando que Claude haga de director de arte (decide qué
hacer con cada foto y escribe el texto) sin que vos toques nada ni veas
ninguna herramienta de render.**

Eso resuelve los requisitos de entrada: consistencia de marca (los "ladrillos"
de movimiento tienen los tokens hardcodeados), consumo mínimo de IA (Claude
solo razona y genera texto, fracciones de centavo), costo casi nulo (el render
corre local, gratis) y cero trabajo manual de diseño.

El motor tiene dos capas:

- **Capa base (el 90% del uso, casi sin cómputo):** se toma una foto real y
  se la anima con zoom/paneo lento (Ken Burns), transiciones de marca y, sobre
  todo, **parallax 2.5D con mapa de profundidad** — la pieza "flota" sobre el
  fondo con un movimiento tridimensional sutil. Encima va el caption flotante.
  Es tu foto real, sin riesgo de artefactos, pero se siente viva. Tus paneles
  calados, con un sujeto fuerte contra fondo claro, son ideales para esto.
- **Capa "wow" (opcional, usa la GPU de 24GB, headless):** para tomas
  selectas, image-to-video con IA local (animar la luz pasando por el calado,
  una sombra moviéndose, humo). La IA decide sola cuándo amerita.

---

## 3. Pilares de contenido

Afinados a lo que muestra el feed: celosías y paneles calados (patrones
orgánicos, geométricos y abstractos) aplicados a arquitectura residencial, en
terminaciones corten/óxido, blanco y negro. Claude rota entre estos pilares
para que el feed tenga variedad. Los pesos son la frecuencia objetivo.

| Pilar | Qué muestra | Peso sugerido |
|---|---|---|
| Panel en contexto | La celosía instalada en su aplicación: portón, cerco, baranda, pérgola, divisor, cerramiento de pileta, fachada, interior. El "imaginate esto en tu espacio" | 35% |
| El diseño / el calado | El patrón en detalle y la variedad de motivos (orgánicos, geométricos, abstractos). Hero del diseño | 25% |
| Luz y sombra | El juego de la sombra del calado proyectada sobre pared, piso o agua. Altísimo valor visual y de engagement | 15% |
| Proceso / máquina en acción | El láser cortando el panel. El "cómo" | 15% |
| Posibilidades / a medida | Terminaciones (corten, blanco, negro), materiales, diseño personalizado. Educativo y comercial | 10% |

Reglas que aplica el cerebro editorial:

- No repetir el mismo pilar dos días seguidos.
- No reutilizar una imagen ya publicada (registro en `content_post`).
- Mantener el tono de marca: sobrio, industrial-elegante, criterio comercial,
  español rioplatense.

---

## 4. Arquitectura

El principio rector es **separar el cerebro siempre-encendido y barato (la
nube) del músculo pesado bajo demanda (la PC con GPU).** La app vive en
Vercel/Supabase, que no tienen GPU ni aguantan renders. La PC dedicada hace el
trabajo pesado, pero nunca recibe conexiones de afuera.

### Flujo

```
┌─────────────────────────────────────────────────────┐
│   Vos — apretás "Generar contenido" (celu o web)    │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│  Cerebro + director de arte (Claude Haiku) — NUBE   │
│  Lee calendario + historial + banco sin usar        │
│  Mira la foto → decide recorte, movimiento, caption │
│  Vuelca todo en un render_spec → crea render_job    │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│        Supabase — cola de render_job + Storage      │
└────────────────────────┬────────────────────────────┘
                         │ la PC PREGUNTA "¿hay job?"
                         │ (polling saliente, sin puertos abiertos)
                         ▼
┌─────────────────────────────────────────────────────┐
│      Worker en tu PC (GPU) — EN EL TALLER           │
│  1. Lee la imagen del banco (Drive)                 │
│  2. (opcional) ComfyUI HEADLESS: image-to-video     │
│  3. Remotion: ejecuta el render_spec → MP4 9:16     │
│  4. Sube el MP4 y marca el job 'done'               │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│   Video listo en Storage/Drive — lo descargás de    │
│   cualquier dispositivo                             │
└─────────────────────────────────────────────────────┘
```

El worker ejecuta el `render_spec` al pie de la letra: no toma decisiones de
diseño, solo renderiza lo que Claude ya decidió. La PC solo trabaja cuando hay
un job.

---

## 5. El banco de imágenes en Drive

El banco es una carpeta más en el mismo Drive de reportería, compartida en
lectura con el Service Account que ya se crea en la Fase 2. Son las mismas
imágenes que ya tenés en Instagram, volcadas a la carpeta.

```
/plasmart-content/
    /banco/        ← fotos de Instagram (paneles, instalaciones, detalles)
    /videos/       ← salidas terminadas (MP4 listos para publicar)
```

El worker puede leer el banco de dos formas:

- **Vía API de Drive**, headless y robusta, igual que la ingesta de reportes.
- **Montando la carpeta localmente** con Google Drive para Escritorio o
  rclone. Como la PC es fija y dedicada, leer de una ruta local es más simple.

Para evitar repetir imágenes, Supabase lleva registro de qué imagen se usó en
qué post. Y como toque que ordena el banco solo: al detectar una imagen
nueva, la PC la auto-analiza una vez con Claude vision (qué es, cómo está
compuesta, orientación, potencial de movimiento) y guarda esos datos. No hay
que etiquetar a mano.

---

## 6. Modelo de datos (tablas nuevas)

Se suman a las tablas del documento principal.

### `content_image` (el banco)

- `id` (uuid, PK)
- `drive_file_id`, `file_name`
- `subject` (enum: 'panel_contexto' | 'calado_detalle' | 'luz_sombra' | 'proceso' | 'material')
- `orientation` (enum: 'portrait' | 'landscape' | 'square')
- `composition` (jsonb — análisis de Claude vision: dónde está el sujeto, qué zona es fondo, dirección de la composición)
- `motion_potential` (enum: 'low' | 'medium' | 'high')
- `depth_map_path`
- `times_used` (int), `last_used_at`
- `added_at`

### `content_post`

- `id` (uuid, PK)
- `scheduled_date` (date)
- `pillar` (enum, ver sección 3)
- `image_id` (uuid, FK → content_image)
- `caption` (text)
- `render_spec` (jsonb — la decisión completa del director de arte, ver abajo)
- `status` (enum: 'draft' | 'rendered' | 'published' | 'skipped')
- `claude_model`, `prompt_tokens`, `completion_tokens`
- `video_file_id`, `rendered_at`, `created_at`

El `render_spec` es el corazón del cambio: en lugar de elegir una plantilla
rígida, Claude describe qué hacer y el worker lo ejecuta. Ejemplo de su
estructura:

```json
{
  "crop": { "target": "panel", "rect_9x16": [0.18, 0.0, 0.64, 1.0], "background_fill": "blur_extend" },
  "movement": { "type": "push_in", "direction": "center", "parallax_intensity": 0.7, "duration_s": 12 },
  "caption": { "text": "Celosía 'Helecho' en corten", "position": "lower_left", "avoid_subject": true },
  "use_ai_i2v": false
}
```

### `render_job` (la cola)

- `id` (uuid, PK), `post_id` (FK)
- `status` (enum: 'pending' | 'processing' | 'done' | 'error')
- `use_ai_i2v` (bool)
- `worker_id`, `locked_at`, `started_at`, `finished_at`, `error_message`

### `worker_heartbeat`

- `worker_id` (PK), `last_seen_at`, `gpu_name`, `status` (enum: 'idle' | 'rendering')

Sirve para que la app muestre "PC de render: online / offline" y avise si está
apagada al generar.

---

## 7. El worker de render y la seguridad

La PC queda always-on, pero **el hardware se usa en remoto sin estar
expuesto**. La regla de oro: la PC nunca recibe conexiones, solo *sale* a
buscar trabajo.

### Cómo funciona

- Un servicio chico (Node) corre en la PC y cada pocos segundos le pregunta a
  Supabase si hay un `render_job` en `pending`.
- Cuando aparece uno, lo toma, lo marca `processing` con un lock, ejecuta el
  `render_spec` y sube el resultado.
- Vos nunca tocás la PC: usás la web app, y la máquina es una granja de
  render invisible. Cero puertos abiertos, cero superficie de ataque.

### ComfyUI es headless — nunca lo ves

Cuando el `render_spec` pide la capa IA, el worker llama a ComfyUI en **modo
API local**, como un motor en segundo plano: le manda la imagen, recibe el
clip, y Remotion lo compone con la marca. El workflow se instala **una sola
vez** como un archivo JSON (lo deja Claude Code en el setup; se puede usar uno
de la comunidad tal cual) y de ahí en más es una caja negra. No se abre la
interfaz nunca.

### Detalles para que sea confiable 24/7

- **Arranque automático:** el worker se levanta solo al prender la PC (Task
  Scheduler o PM2) y se reinicia si se cae.
- **Heartbeat:** escribe `last_seen_at`; la app muestra online/offline.
- **Cola robusta:** estados `pending → processing → done/error`, con lock para
  no procesar dos veces y timeout para recuperar colgados.

### Acceso manual a la PC (solo para vos como dev)

Si alguna vez necesitás entrar a la PC, usá **Tailscale** (red privada mesh,
plan free, sin abrir puertos) o Cloudflare Tunnel. Nunca port-forwarding
crudo. Pero el flujo diario va siempre por polling, y no requiere tocar nada.

---

## 8. Claude como director de arte

Acá está el cambio central respecto a la v1.0. **Vos no elegís plantilla ni
diseñás nada.** Claude mira cada foto y decide solo qué conviene hacer con
ella.

Por cada imagen, Claude (con visión) razona y produce el `render_spec`:

- **Qué es y cómo está compuesta:** panel hero, toma arquitectónica amplia,
  detalle del calado, instalación con contexto, o juego de luz y sombra.
- **El recorte a 9:16:** clave, porque muchas fotos son horizontales
  (portones, cercos, fachadas). Decide qué parte enfocar y cómo rellenar el
  fondo (blur extendido, color de marca) para que no quede una banda fea.
- **El movimiento:** push-in lento, paneo siguiendo la dirección de la
  composición, e intensidad del parallax según cuánta profundidad detecta el
  mapa.
- **El caption:** gancho, pilar al que pertenece, y dónde ubicarlo para no
  tapar la pieza.
- **Si amerita la capa IA:** por ejemplo, animar la luz pasando por el
  calado, o si con motion graphics ya alcanza.

### Los "ladrillos" se construyen una sola vez

La parte honesta: alguien construye **una única vez** un kit de movimientos y
composición de marca —los "ladrillos" con los que Claude arma cada video—. La
IA necesita primitivas reales con qué trabajar; sin ellas sería impredecible y
se iría de marca. Pero ese kit lo genera **Claude Code en el setup**, es
genérico y parametrizable, y **no se toca nunca más**. De ahí en adelante:
cero diseño, cero ComfyUI, cero elegir.

La marca queda garantizada por construcción: los ladrillos tienen los tokens
hardcodeados (negro `#1A1A1A`, acento cobre `#C9A961`, fondo crema `#F5F5F0`,
tipografía Inter en mayúsculas con tracking amplio). Formato 1080×1920, 9:16,
10-15s, diseñado para funcionar mudo.

El kit se implementa como composiciones de **Remotion** (video por código en
React) parametrizadas por el `render_spec`. Remotion también importa los
clips de la capa IA como fuente de video y los compone solo.

---

## 9. El cerebro editorial

Es donde se usa el token de Anthropic que ya tiene el proyecto. Claude nunca
genera píxeles, solo razona y escribe texto.

Cuando apretás "generar contenido", el cerebro:

1. Mira qué pilar toca hoy según el calendario rotativo.
2. Mira qué se publicó los últimos días (para no repetir).
3. Elige una imagen sin usar del banco que encaje con el pilar.
4. **Hace de director de arte** (sección 8): analiza esa foto y produce el
   `render_spec` completo.
5. Escribe el caption en voz de marca.
6. Guarda el `content_post` y encola el `render_job`.

### Minimizar consumo de tokens

- Claude solo escribe texto y un JSON chico (el `render_spec`). Es minúsculo.
- El análisis de cada imagen se hace **una sola vez** al ingresarla al banco;
  después se reusa.
- Se puede generar el plan de toda una semana en una sola llamada.
- Modelo: `claude-haiku-4-5`. Costo estimado: centavos por mes.

---

## 10. GPU: hoy 8GB, en una semana 24GB

La arquitectura está pensada para que la transición sea trivial. El código
del worker no cambia entre una placa y la otra: misma cola, mismo Remotion,
mismo flujo de seguridad. La capa IA es solo un paso opcional dentro del job.

### Hoy (8GB) — se construye y queda funcionando todo

- La capa base corre sin problema: Depth Anything genera los mapas de
  profundidad para el parallax en 8GB, y Remotion renderiza liviano.
- Banco en Drive, cerebro editorial + director de arte, kit de movimientos,
  worker, cola y seguridad: todo se hace esta semana.
- Si querés algo de IA ya mismo, AnimateDiff corre en 8GB para loops simples.

### Semana que viene (24GB) — se desbloquea la capa "wow"

- Wan 2.2 14B vía ComfyUI headless: el favorito de la comunidad para
  image-to-video, licencia Apache 2.0 comercial, mejor relación calidad/VRAM.
- Migración = swap del archivo del modelo + del workflow JSON. Nada más. No
  se toca la interfaz.

---

## 11. Costos

| Concepto | Costo mensual |
|---|---|
| Render local (Remotion + ComfyUI) | USD 0 (solo electricidad) |
| Claude Haiku (planning + captions + análisis) | centavos |
| Storage de videos (Supabase/Drive) | USD 0 (dentro de cuotas free) |
| **Adicional sobre el proyecto base** | **prácticamente nulo** |

---

## 12. Desarrollo por sub-fases

Misma regla que el resto del proyecto: no avanzar si la sub-fase actual no
pasa sus criterios de aceptación.

### FASE 8.0 — Banco y preparación
**Duración estimada: 1 día**

**Tareas**
- Crear `/plasmart-content/banco/` y `/videos/` en Drive y compartirlas con el
  Service Account.
- Volcar las imágenes de Instagram a `/banco/`.
- Crear las tablas `content_image`, `content_post`, `render_job`,
  `worker_heartbeat` en migrations.

**Criterios de aceptación**
- Las carpetas existen y el Service Account puede leerlas.
- Las migrations aplican limpio.

---

### FASE 8.1 — Kit de movimientos y render base (funciona en 8GB)
**Duración estimada: 4-6 días**

**Tareas**
- Con Claude Code, construir el kit de "ladrillos" de movimiento y
  composición de marca como composiciones Remotion parametrizables (push-in,
  paneo, parallax, caption flotante, recorte 9:16 con relleno de fondo).
- Integrar Depth Anything para el mapa de profundidad y el parallax 2.5D.
- Script de render que recibe un `render_spec` + imagen → produce el MP4
  1080×1920 de 10-15s.
- Probar a mano con varios `render_spec` distintos sobre fotos reales del
  banco.

**Criterios de aceptación**
- Un `render_spec` produce un MP4 9:16 en marca, con parallax y caption.
- El kit es genérico: el mismo set de ladrillos sirve para un panel hero, una
  toma arquitectónica amplia y un detalle del calado.
- Una foto horizontal queda bien recortada a vertical, sin bandas feas.
- Todo corre en la placa de 8GB.

---

### FASE 8.2 — Cerebro editorial + dirección de arte
**Duración estimada: 4-5 días**

**Tareas**
- Auto-análisis: al ingresar una imagen, Claude vision completa `subject`,
  `orientation`, `composition`, `motion_potential`.
- Edge Function del calendario rotativo por pilares y pesos.
- Director de arte: Claude analiza la imagen elegida y produce el
  `render_spec` (recorte, movimiento, caption, capa IA sí/no) + el caption.
- Botón "generar contenido" que dispara el cerebro y crea el `render_job`.

**Criterios de aceptación**
- Una imagen nueva queda analizada sola.
- Apretar "generar" produce un `render_spec` coherente: el recorte de una
  foto horizontal enfoca el panel, el caption no lo tapa, y la decisión de
  capa IA es razonable.
- El caption es específico (menciona el panel/aplicación real), no genérico.
- No se repiten imágenes ni pilar dos días seguidos.

---

### FASE 8.3 — Worker local y seguridad
**Duración estimada: 2-3 días**

**Tareas**
- Servicio de polling en la PC que toma jobs pending, ejecuta el
  `render_spec` con la capa base y sube el MP4.
- Lock + timeout en la cola; heartbeat a `worker_heartbeat`.
- Arranque automático y auto-restart.
- Indicador online/offline en la app y aviso si la PC está apagada.
- (Para dev) Tailscale para acceso manual.

**Criterios de aceptación**
- Apretás "generar" desde el celu y, con la PC prendida, el video aparece
  listo a los pocos minutos.
- La PC no tiene ningún puerto abierto hacia afuera.
- Si la PC está apagada, la app lo indica.
- Un job nunca se procesa dos veces.

---

### FASE 8.4 — Capa IA opcional headless (se activa con la 24GB)
**Duración estimada: 2-3 días (después de tener la placa)**

**Tareas**
- Instalar ComfyUI en la PC en modo API/headless y descargar Wan 2.2 14B + un
  workflow de image-to-video (JSON, una sola vez).
- Que el worker, cuando el `render_spec` pida `use_ai_i2v`, pase la imagen
  por ComfyUI y luego la componga con Remotion.

**Criterios de aceptación**
- Una imagen marcada por el director de arte produce un clip con movimiento
  realista, compuesto con la marca.
- Todo ocurre sin abrir la interfaz de ComfyUI ni una vez.
- El código del worker es el mismo que en 8.3, solo con el paso extra
  opcional.

---

### FASE 8.5 — Refinamientos y rutina
**Duración estimada: 1-2 días**

**Tareas**
- Vista de calendario en la app: agendado, publicado y pendiente.
- Botón "regenerar" (otra imagen o que Claude redecida el `render_spec`) por
  si una sugerencia no convence.
- Marcar un post como `published` cuando lo subís.
- README del módulo: cómo agregar un ladrillo al kit, cómo ajustar pilares,
  cómo cambiar el prompt de Claude.

**Criterios de aceptación**
- Ves de un vistazo qué se publicó y qué viene.
- Podés rechazar una sugerencia y pedir otra sin tocar código.

---

## 13. Checklist

### Fase 8.0 – Banco y preparación
- [ ] Carpetas `/banco/` y `/videos/` creadas y compartidas
- [ ] Imágenes de Instagram volcadas al banco
- [ ] Tablas nuevas creadas

### Fase 8.1 – Kit y render base
- [ ] Kit de ladrillos Remotion parametrizable con tokens de marca
- [ ] Parallax 2.5D con Depth Anything en 8GB
- [ ] Render desde `render_spec` validado a mano
- [ ] Recorte 9:16 de fotos horizontales sin bandas

### Fase 8.2 – Cerebro + dirección de arte
- [ ] Auto-análisis de imágenes con Claude vision
- [ ] Calendario rotativo por pilares
- [ ] Generación del `render_spec` + caption
- [ ] Botón "generar contenido"

### Fase 8.3 – Worker y seguridad
- [ ] Servicio de polling en la PC
- [ ] Lock, timeout y heartbeat
- [ ] Arranque automático y auto-restart
- [ ] Indicador online/offline
- [ ] Tailscale para acceso dev

### Fase 8.4 – Capa IA headless (con la 24GB)
- [ ] ComfyUI headless + Wan 2.2 14B instalado
- [ ] Workflow JSON cargado una sola vez
- [ ] Paso I2V opcional integrado, sin abrir la interfaz

### Fase 8.5 – Refinamientos
- [ ] Vista de calendario
- [ ] Botón regenerar
- [ ] Marcar como publicado
- [ ] README del módulo

---

> Esta spec se commiteó al repo para que cualquier sesión (Claude Code o
> humana) la tenga a mano. El estado vivo de los avances vive en
> `CHECKLIST.md`; el setup operativo (env, Drive, migrations) en
> `docs/fase8-contenido.md`; el código del worker en `worker/README.md`.

*— FIN DEL ANEXO —*
