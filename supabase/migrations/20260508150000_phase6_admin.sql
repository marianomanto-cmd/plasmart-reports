-- =====================================================================
-- Fase 6 · Admin: ingesta manual con cooldown
-- =====================================================================


-- ---- RPC: chequeo de cooldown -------------------------------------
-- Devuelve la última corrida (de cualquier fuente) en los últimos N
-- minutos. Si devuelve null, no hay cooldown activo y se puede disparar
-- una nueva ingesta. Si devuelve una fila, hay que esperar.
--
-- Toma la corrida más reciente del log para calcular el "elapsed" desde
-- el cliente sin tener que pasar el reloj del server.

create or replace function dashboard_last_ingestion(
  p_within_minutes int default 10
)
returns table (
  last_started_at timestamptz,
  last_status     text,
  minutes_ago     numeric
)
language sql
stable
security invoker
as $$
  select
    started_at                                                    as last_started_at,
    status                                                        as last_status,
    extract(epoch from (now() - started_at)) / 60                 as minutes_ago
  from ingestion_log
  where started_at > now() - make_interval(mins => p_within_minutes)
  order by started_at desc
  limit 1;
$$;


-- ---- RPC: última fecha de datos por fuente ------------------------
-- Para mostrar en /admin "los datos de GAds llegan hasta el día X".
-- gads y meta usan fact_campaign_daily filtrado por publisher.
-- ga4 usa fact_ga_daily.

create or replace function dashboard_data_freshness()
returns table (
  source        text,
  max_data_date date,
  rows_total    bigint
)
language sql
stable
security invoker
as $$
  select
    'gads'::text                              as source,
    max(f.date)                               as max_data_date,
    count(*)::bigint                          as rows_total
  from fact_campaign_daily f
  join dim_campaign c on c.id = f.campaign_id
  where c.publisher = 'gads'

  union all

  select
    'meta'::text                              as source,
    max(f.date)                               as max_data_date,
    count(*)::bigint                          as rows_total
  from fact_campaign_daily f
  join dim_campaign c on c.id = f.campaign_id
  where c.publisher = 'meta'

  union all

  select
    'ga4'::text                               as source,
    max(date)                                 as max_data_date,
    count(*)::bigint                          as rows_total
  from fact_ga_daily;
$$;


-- ---- Permisos -----------------------------------------------------

grant execute on function dashboard_last_ingestion(int) to authenticated;
grant execute on function dashboard_data_freshness()    to authenticated;
