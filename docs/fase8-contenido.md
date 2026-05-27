# Fase 8 — Motor de contenido: setup (lado app / Vercel)

Qué hay que configurar para que `/contenido` funcione en el Preview. Todo es
**aditivo**: no toca env vars, rutas ni tablas de producción.

## 1. Carpetas de Drive (manual)

Crear dentro del mismo Drive de reportería y **compartir en lectura con el
Service Account** que ya usa la ingesta:

```
/plasmart-content/
    /banco/     ← fotos de Instagram (las analiza Claude vision)
    /videos/    ← salida del worker (MP4). Se comparte con ESCRITURA para el worker.
```

Anotá el **ID de cada carpeta** (está en la URL de Drive) para las env vars.

## 2. Migration (8.0)

`supabase/migrations/20260527130000_phase8_content_engine.sql` crea las tablas
nuevas (`content_image`, `content_post`, `render_job`, `worker_heartbeat`), sus
enums, RLS de sólo-lectura y el RPC `claim_render_job`. Es 100% aditiva.

Probar local antes de aplicar a cualquier base remota:

```bash
supabase db reset   # aplica todas las migrations sobre el stack local
```

Aplicar a la base del Preview (idealmente un proyecto Supabase free aparte):

```bash
supabase db push    # con el proyecto del Preview linkeado
```

## 3. Env vars (environment **Preview**, no Production)

| Variable | Para qué | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | base del Preview | del proyecto que uses para el branch |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem | |
| `SUPABASE_SERVICE_ROLE_KEY` | mutaciones server-side | ya existe el patrón en el proyecto |
| `ANTHROPIC_API_KEY` | cerebro editorial | **reusar la que ya existe** |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | leer el banco de Drive | el mismo SA de la ingesta, en una línea |
| `DRIVE_FOLDER_BANCO` | id de la carpeta `/banco/` | **nueva** |
| `ANTHROPIC_CONTENT_MODEL` | opcional | default `claude-haiku-4-5` |

> `DRIVE_FOLDER_VIDEOS` y las credenciales de escritura van en el `.env` del
> **worker** (la PC), no en Vercel. Ver `worker/.env.example`.

## 4. Cómo funciona `/contenido`

1. **Sincronizar banco** → lista `/banco/` en Drive, inserta las fotos nuevas
   en `content_image` y analiza un lote con Claude vision (subject, orientación,
   composición, potencial de movimiento). Si quedan pendientes, volvé a apretar.
2. **Generar contenido** → el cerebro elige el pilar del día (rotación por
   pesos, sin repetir el anterior), toma una foto sin usar de ese pilar, y
   Claude (director de arte) decide el `render_spec` (recorte 9:16, movimiento,
   caption). Crea un `content_post` (draft) + un `render_job` (pending).
3. El **worker** (PC) toma el job, renderiza el MP4 y lo sube a `/videos/`,
   marcando el post `rendered`. *(Fase 8.3.)*
4. En `/contenido` aparece el video: lo **descargás**, le ponés audio y lo
   publicás. Después lo marcás **publicado**. También podés **regenerar**
   (otra foto del mismo pilar) o **descartar**.

El indicador "PC de render: online/offline" sale del `worker_heartbeat`.
