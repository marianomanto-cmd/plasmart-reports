-- =====================================================================
-- Fase 5 · Cache de análisis de Claude
-- La tabla ai_analysis_cache ya existe desde la migración inicial.
-- Esta migración solo agrega RPCs para lookup e insert con permisos
-- adecuados.
-- =====================================================================


-- ---- RLS: permitir insert desde el backend (server-side) ------------
-- La tabla tiene RLS habilitado con una política de SELECT para usuarios
-- @transfil.com.ar. Falta una política de INSERT para que el backend de
-- Next pueda guardar nuevos análisis. Como el backend usa el cliente
-- normal (con la cookie de sesión del usuario), la política se aplica al
-- rol authenticated.

drop policy if exists "Authenticated transfil users can write ai cache" on ai_analysis_cache;

create policy "Authenticated transfil users can write ai cache"
  on ai_analysis_cache for insert
  to authenticated
  with check (auth.email() like '%@transfil.com.ar');


-- ---- RPC: lookup de cache -----------------------------------------
-- Dado un hash de filtros y la fecha máxima de datos disponibles,
-- devuelve el análisis cacheado si existe. La unicidad ya está
-- garantizada por el constraint UNIQUE (filters_hash, data_max_date).

create or replace function dashboard_ai_cache_lookup(
  p_filters_hash  text,
  p_data_max_date date
)
returns table (
  id            uuid,
  generated_at  timestamptz,
  model_used    text,
  content       text
)
language sql
stable
security invoker
as $$
  select
    id,
    generated_at,
    model_used,
    content
  from ai_analysis_cache
  where filters_hash = p_filters_hash
    and data_max_date = p_data_max_date
  limit 1;
$$;


-- ---- RPC: máxima fecha con datos en el período ---------------------
-- Sirve para construir la clave de cache. Si los datos del período
-- llegan hasta hoy, mañana invalidamos automáticamente el cache.

create or replace function dashboard_max_data_date(
  p_from date,
  p_to   date
)
returns date
language sql
stable
security invoker
as $$
  select max(date)
  from fact_campaign_daily
  where date between p_from and p_to;
$$;


-- ---- Permisos -------------------------------------------------------

grant execute on function dashboard_ai_cache_lookup(text, date) to authenticated;
grant execute on function dashboard_max_data_date(date, date)   to authenticated;
