-- =====================================================================
-- Fase 8 · Motor de contenido para redes
-- =====================================================================
-- ADITIVO: crea SÓLO tablas/enums/RPC NUEVOS. No toca nada existente.
-- Las mutaciones (insert/update) se hacen server-side con el service role
-- (que bypassea RLS); las policies sólo habilitan LECTURA a usuarios
-- @transfil.com.ar, igual que el resto del dashboard.
-- =====================================================================

-- Limpieza por si la migration se reaplica en un entorno limpio
-- (sólo objetos NUEVOS de esta fase; respeta el orden de FKs).
drop function if exists claim_render_job(text);
drop table if exists render_job;
drop table if exists content_post;
drop table if exists worker_heartbeat;
drop table if exists content_image;
drop type if exists content_subject;
drop type if exists content_orientation;
drop type if exists motion_potential;
drop type if exists content_post_status;
drop type if exists render_job_status;
drop type if exists worker_status;

-- ============================================================
-- Tipos enum
-- ============================================================

-- Pilares de contenido (sección 3). Sirve tanto para clasificar la imagen
-- (content_image.subject) como para etiquetar el post (content_post.pillar).
create type content_subject as enum (
  'panel_contexto', -- la celosía instalada en su aplicación
  'calado_detalle', -- el patrón/diseño en detalle
  'luz_sombra',     -- el juego de sombra del calado
  'proceso',        -- el láser cortando, el "cómo"
  'material'        -- terminaciones, materiales, a medida
);

create type content_orientation as enum ('portrait', 'landscape', 'square');

create type motion_potential as enum ('low', 'medium', 'high');

create type content_post_status as enum (
  'draft',     -- generado, esperando render
  'rendered',  -- el worker subió el MP4
  'published', -- Mariano lo publicó en IG
  'skipped'    -- descartado
);

create type render_job_status as enum ('pending', 'processing', 'done', 'error');

create type worker_status as enum ('idle', 'rendering');

-- ============================================================
-- content_image — el banco de imágenes
-- ============================================================

create table content_image (
  id              uuid primary key default gen_random_uuid(),
  drive_file_id   text not null unique,
  file_name       text not null,
  subject         content_subject,       -- null hasta que Claude la analiza
  orientation     content_orientation,
  -- análisis de Claude vision: dónde está el sujeto, zona de fondo, dirección
  composition     jsonb,
  motion_potential motion_potential,
  depth_map_path  text,
  times_used      int not null default 0,
  last_used_at    timestamptz,
  analyzed_at     timestamptz,           -- null = todavía sin auto-análisis
  added_at        timestamptz not null default now()
);

create index content_image_subject_idx on content_image (subject);
create index content_image_usage_idx on content_image (times_used, last_used_at);

-- ============================================================
-- content_post
-- ============================================================

create table content_post (
  id                uuid primary key default gen_random_uuid(),
  scheduled_date    date not null default current_date,
  pillar            content_subject not null,
  image_id          uuid references content_image (id) on delete set null,
  caption           text,
  -- decisión completa del director de arte (recorte/movimiento/caption/IA)
  render_spec       jsonb not null,
  status            content_post_status not null default 'draft',
  claude_model      text,
  prompt_tokens     int,
  completion_tokens int,
  video_file_id     text,                -- id del MP4 en Drive (/videos/)
  rendered_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index content_post_status_idx on content_post (status, created_at desc);
create index content_post_image_idx on content_post (image_id);

-- ============================================================
-- render_job — la cola
-- ============================================================

create table render_job (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references content_post (id) on delete cascade,
  status        render_job_status not null default 'pending',
  use_ai_i2v    boolean not null default false,
  worker_id     text,
  locked_at     timestamptz,
  started_at    timestamptz,
  finished_at   timestamptz,
  error_message text,
  created_at    timestamptz not null default now()
);

create index render_job_status_idx on render_job (status, created_at);

-- ============================================================
-- worker_heartbeat — online/offline de la PC de render
-- ============================================================

create table worker_heartbeat (
  worker_id    text primary key,
  last_seen_at timestamptz not null default now(),
  gpu_name     text,
  status       worker_status not null default 'idle'
);

-- ============================================================
-- RLS — sólo lectura para usuarios @transfil.com.ar
-- ============================================================

alter table content_image enable row level security;
alter table content_post enable row level security;
alter table render_job enable row level security;
alter table worker_heartbeat enable row level security;

create policy "Authenticated transfil users can read content_image"
  on content_image for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

create policy "Authenticated transfil users can read content_post"
  on content_post for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

create policy "Authenticated transfil users can read render_job"
  on render_job for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

create policy "Authenticated transfil users can read worker_heartbeat"
  on worker_heartbeat for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

-- ============================================================
-- RPC: claim_render_job — toma atómicamente el próximo job pending
-- ============================================================
-- El worker (service role) lo llama en cada poll. FOR UPDATE SKIP LOCKED
-- garantiza que dos workers nunca tomen el mismo job. security definer para
-- que la lógica de lock corra con permisos plenos.

create or replace function claim_render_job(p_worker_id text)
returns table (id uuid, post_id uuid, use_ai_i2v boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select rj.id into v_id
  from render_job rj
  where rj.status = 'pending'
  order by rj.created_at
  for update skip locked
  limit 1;

  if v_id is null then
    return;
  end if;

  update render_job
  set status = 'processing',
      worker_id = p_worker_id,
      locked_at = now(),
      started_at = now()
  where render_job.id = v_id;

  return query
  select rj.id, rj.post_id, rj.use_ai_i2v
  from render_job rj
  where rj.id = v_id;
end;
$$;

comment on function claim_render_job is
  'Toma atómicamente el próximo render_job pending y lo marca processing. Lo llama el worker (service role) en cada poll.';

grant execute on function claim_render_job(text) to authenticated, service_role;
