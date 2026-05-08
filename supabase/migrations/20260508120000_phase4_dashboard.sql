-- =====================================================================
-- Fase 4 · Dashboard de KPIs y filtros
-- RPCs para servir el reporte con filtros arbitrarios.
-- Los índices necesarios sobre fact_campaign_daily y dim_campaign ya
-- fueron creados en la migración inicial; esta migración no agrega
-- índices nuevos.
-- =====================================================================


-- ---- RPC: totales agregados (KPI cards) -----------------------------
-- Devuelve una sola fila con la suma de cada métrica para el rango y
-- filtros dados. Lo usamos dos veces por carga del dashboard: una para
-- el período actual y otra para el período de comparación.

create or replace function dashboard_kpi_totals(
  p_from        date,
  p_to          date,
  p_publisher   text default null,
  p_type        text default null,
  p_campaign_id uuid default null
)
returns table (
  cost        numeric,
  impressions bigint,
  clicks      bigint,
  conversions numeric
)
language sql
stable
security invoker
as $$
  select
    coalesce(sum(f.cost_ars), 0)::numeric    as cost,
    coalesce(sum(f.impressions), 0)::bigint  as impressions,
    coalesce(sum(f.clicks), 0)::bigint       as clicks,
    coalesce(sum(f.conversions), 0)::numeric as conversions
  from fact_campaign_daily f
  join dim_campaign c on c.id = f.campaign_id
  where f.date between p_from and p_to
    and (p_publisher   is null or c.publisher::text = p_publisher)
    and (p_type        is null or c.type::text      = p_type)
    and (p_campaign_id is null or f.campaign_id     = p_campaign_id);
$$;


-- ---- RPC: serie diaria por publisher (gráfico de línea) -------------
-- Una fila por (fecha, publisher). El frontend hace pivot a 2 series.

create or replace function dashboard_daily_by_publisher(
  p_from        date,
  p_to          date,
  p_publisher   text default null,
  p_type        text default null,
  p_campaign_id uuid default null
)
returns table (
  date      date,
  publisher text,
  cost      numeric
)
language sql
stable
security invoker
as $$
  select
    f.date,
    c.publisher::text                       as publisher,
    coalesce(sum(f.cost_ars), 0)::numeric   as cost
  from fact_campaign_daily f
  join dim_campaign c on c.id = f.campaign_id
  where f.date between p_from and p_to
    and (p_publisher   is null or c.publisher::text = p_publisher)
    and (p_type        is null or c.type::text      = p_type)
    and (p_campaign_id is null or f.campaign_id     = p_campaign_id)
  group by f.date, c.publisher
  order by f.date asc, c.publisher asc;
$$;


-- ---- RPC: filas por campaña (top + tabla detalle) -------------------
-- p_limit null → todas. p_limit 10 → top 10 por inversión.
-- Devuelve también ctr/cpc/cpa promediados sobre el rango. No reusamos
-- las columnas generadas porque agregadas no tienen sentido fila a
-- fila — las recomputamos sobre los totales.

create or replace function dashboard_campaign_rows(
  p_from        date,
  p_to          date,
  p_publisher   text default null,
  p_type        text default null,
  p_campaign_id uuid default null,
  p_limit       int  default null
)
returns table (
  campaign_id uuid,
  name        text,
  publisher   text,
  type        text,
  cost        numeric,
  impressions bigint,
  clicks      bigint,
  conversions numeric,
  ctr         numeric,
  cpc         numeric,
  cpa         numeric
)
language sql
stable
security invoker
as $$
  with agg as (
    select
      c.id                                     as campaign_id,
      c.name,
      c.publisher::text                        as publisher,
      c.type::text                             as type,
      coalesce(sum(f.cost_ars), 0)::numeric    as cost,
      coalesce(sum(f.impressions), 0)::bigint  as impressions,
      coalesce(sum(f.clicks), 0)::bigint       as clicks,
      coalesce(sum(f.conversions), 0)::numeric as conversions
    from fact_campaign_daily f
    join dim_campaign c on c.id = f.campaign_id
    where f.date between p_from and p_to
      and (p_publisher   is null or c.publisher::text = p_publisher)
      and (p_type        is null or c.type::text      = p_type)
      and (p_campaign_id is null or f.campaign_id     = p_campaign_id)
    group by c.id, c.name, c.publisher, c.type
  )
  select
    a.campaign_id,
    a.name,
    a.publisher,
    a.type,
    a.cost,
    a.impressions,
    a.clicks,
    a.conversions,
    case when a.impressions > 0 then a.clicks::numeric / a.impressions else 0 end as ctr,
    case when a.clicks      > 0 then a.cost / a.clicks                else 0 end as cpc,
    case when a.conversions > 0 then a.cost / a.conversions           else 0 end as cpa
  from agg a
  order by a.cost desc
  limit coalesce(p_limit, 1000);
$$;


-- ---- RPC: opciones disponibles para los selects ---------------------
-- Solo devolvemos tipos y campañas que tuvieron datos en el rango,
-- así los selects nunca muestran opciones vacías.

create or replace function dashboard_available_filters(
  p_from      date,
  p_to        date,
  p_publisher text default null
)
returns table (
  types     text[],
  campaigns jsonb
)
language sql
stable
security invoker
as $$
  with t as (
    select distinct c.type::text as v
    from fact_campaign_daily f
    join dim_campaign c on c.id = f.campaign_id
    where f.date between p_from and p_to
      and (p_publisher is null or c.publisher::text = p_publisher)
  ),
  k as (
    select distinct
      c.id,
      c.name,
      c.publisher::text as publisher,
      c.type::text      as type
    from fact_campaign_daily f
    join dim_campaign c on c.id = f.campaign_id
    where f.date between p_from and p_to
      and (p_publisher is null or c.publisher::text = p_publisher)
  )
  select
    coalesce(array(select v from t order by v), array[]::text[]) as types,
    coalesce(
      (select jsonb_agg(
                 jsonb_build_object(
                   'id', id,
                   'name', name,
                   'publisher', publisher,
                   'type', type
                 )
                 order by name
               )
         from k),
      '[]'::jsonb
    ) as campaigns;
$$;


-- ---- Permisos -------------------------------------------------------
-- Las RPCs son `security invoker`, así que respetan las políticas RLS
-- existentes (lectura solo para usuarios @transfil.com.ar).

grant execute on function dashboard_kpi_totals(date, date, text, text, uuid)         to authenticated;
grant execute on function dashboard_daily_by_publisher(date, date, text, text, uuid) to authenticated;
grant execute on function dashboard_campaign_rows(date, date, text, text, uuid, int) to authenticated;
grant execute on function dashboard_available_filters(date, date, text)              to authenticated;
