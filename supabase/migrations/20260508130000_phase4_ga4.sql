-- =====================================================================
-- Fase 4 · Sección GA4 del dashboard
-- RPCs para servir los KPIs y la tabla de fuente/medio.
-- Solo dependen del rango de fechas — GA4 no comparte los filtros de
-- campaña (publisher/type/campaign_id) con la sección de pagas.
-- =====================================================================


-- ---- RPC: totales agregados de GA4 (KPI cards) ----------------------
-- bounce_rate se promedia ponderado por sesiones para que un día con
-- pocas sesiones no distorsione el agregado.

create or replace function dashboard_ga4_totals(
  p_from date,
  p_to   date
)
returns table (
  sessions    bigint,
  users       bigint,
  new_users   bigint,
  key_events  numeric,
  bounce_rate numeric,
  avg_session_duration numeric
)
language sql
stable
security invoker
as $$
  select
    coalesce(sum(sessions), 0)::bigint               as sessions,
    coalesce(sum(total_users), 0)::bigint            as users,
    coalesce(sum(new_users), 0)::bigint              as new_users,
    coalesce(sum(key_events), 0)::numeric            as key_events,
    case
      when coalesce(sum(sessions), 0) > 0
      then sum(bounce_rate * sessions) / sum(sessions)
      else 0
    end::numeric                                     as bounce_rate,
    case
      when coalesce(sum(sessions), 0) > 0
      then sum(avg_session_duration * sessions) / sum(sessions)
      else 0
    end::numeric                                     as avg_session_duration
  from fact_ga_daily
  where date between p_from and p_to;
$$;


-- ---- RPC: filas por fuente/medio (tabla detalle GA4) ---------------
-- Una fila por (source, medium) en el período. Ordenadas por sesiones
-- descendente. p_limit null → todas.

create or replace function dashboard_ga4_source_medium(
  p_from  date,
  p_to    date,
  p_limit int default null
)
returns table (
  source      text,
  medium      text,
  sessions    bigint,
  users       bigint,
  key_events  numeric,
  bounce_rate numeric
)
language sql
stable
security invoker
as $$
  select
    source,
    medium,
    coalesce(sum(sessions), 0)::bigint        as sessions,
    coalesce(sum(total_users), 0)::bigint     as users,
    coalesce(sum(key_events), 0)::numeric     as key_events,
    case
      when coalesce(sum(sessions), 0) > 0
      then sum(bounce_rate * sessions) / sum(sessions)
      else 0
    end::numeric                              as bounce_rate
  from fact_ga_daily
  where date between p_from and p_to
  group by source, medium
  order by sessions desc
  limit coalesce(p_limit, 1000);
$$;


-- ---- Permisos -------------------------------------------------------

grant execute on function dashboard_ga4_totals(date, date)              to authenticated;
grant execute on function dashboard_ga4_source_medium(date, date, int)  to authenticated;
