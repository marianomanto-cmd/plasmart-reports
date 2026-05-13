-- =====================================================================
-- v1.3 · Contexto editable para los análisis de Claude / Corey Haines
--
-- Hasta ahora el ACCOUNT_CONTEXT vivía hardcodeado en
-- lib/ai/account-context.ts. Esta migración lo mueve a una tabla
-- singleton para que el usuario pueda editarlo desde la UI:
--   - 4 campos estables (empresa, audiencia, economía, tracking)
--   - 4 campos de foco del análisis (variables, cambian seguido)
--   - 2 campos de reglas / tono
--
-- La tabla es singleton: constraint id = 1 garantiza una sola fila.
-- Las API routes leen esta fila antes de armar los prompts y la
-- incluyen vía updated_at en el hash de cache para invalidar
-- automáticamente cuando el contexto cambia.
-- =====================================================================


-- ---- Tabla ----------------------------------------------------------

create table if not exists analysis_context (
  id            int          primary key default 1,
  -- Bloque 1: estable (cambia rara vez)
  company           text not null default '',
  audience          text not null default '',
  economics         text not null default '',
  tracking          text not null default '',
  -- Bloque 2: foco del análisis (cambia seguido)
  focus             text not null default '',
  decision          text not null default '',
  business_context  text not null default '',
  scope             text not null default '',
  -- Bloque 3: reglas + tono
  rules             text not null default '',
  output_tone       text not null default '',
  -- Auditoría
  updated_at        timestamptz not null default now(),
  updated_by        text,
  constraint analysis_context_singleton check (id = 1)
);

comment on table analysis_context is
  'Singleton (id=1) con el contexto editable que se inyecta en los prompts de Claude y Corey Haines.';


-- ---- Seed inicial ---------------------------------------------------
-- Copia el ACCOUNT_CONTEXT actual a la fila singleton si todavía no
-- existe. Es idempotente: si la fila ya está, no hace nada.

insert into analysis_context (
  id,
  company,
  audience,
  economics,
  tracking,
  focus,
  decision,
  business_context,
  scope,
  rules,
  output_tone
)
values (
  1,
  'Plasmart es una empresa de Córdoba (Argentina) parte del grupo Transfil. Negocio: corte láser y plasma de acero, plus plegado CNC. Capacidades técnicas: corte láser hasta 6,35mm, plasma hasta 32mm, plegado CNC.',
  'B2C: arquitectos, diseñadores, herreros, particulares con proyectos. B2B: industria metalmecánica, fabricantes de equipos, talleres. El cliente B2B vale órdenes de magnitud más que el B2C.',
  'Moneda: pesos argentinos (ARS). Frecuencia de revisión: semanal. Mantener costos por adquisición sostenibles dadas las márgenes industriales.',
  'Cuentas activas: Google Ads, Meta Ads, GA4 (tráfico web).',
  '',
  '',
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;


-- ---- RLS ------------------------------------------------------------
-- SELECT y UPDATE para usuarios autenticados con email @transfil.com.ar.
-- No habilitamos INSERT/DELETE: la fila singleton se mantiene siempre.

alter table analysis_context enable row level security;

drop policy if exists "Transfil users can read analysis context" on analysis_context;
create policy "Transfil users can read analysis context"
  on analysis_context for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

drop policy if exists "Transfil users can update analysis context" on analysis_context;
create policy "Transfil users can update analysis context"
  on analysis_context for update
  to authenticated
  using (auth.email() like '%@transfil.com.ar')
  with check (auth.email() like '%@transfil.com.ar');


-- ---- Trigger: updated_at + updated_by -------------------------------
-- Cada vez que se actualiza la fila, registramos cuándo y quién.

create or replace function analysis_context_touch()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.email(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists analysis_context_touch_trigger on analysis_context;
create trigger analysis_context_touch_trigger
  before update on analysis_context
  for each row
  execute function analysis_context_touch();
