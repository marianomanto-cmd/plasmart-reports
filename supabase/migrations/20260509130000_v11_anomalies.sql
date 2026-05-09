-- =====================================================================
-- v1.1 · Paso 4: Detección de anomalías en campañas
-- Una RPC que evalúa 3 reglas por campaña sobre el período filtrado.
-- =====================================================================

create or replace function dashboard_campaign_anomalies(
  p_from        date,
  p_to          date,
  p_prev_from   date default null,
  p_prev_to     date default null,
  p_publisher   text default null,
  p_type        text default null
)
returns table (
  campaign_id    uuid,
  is_learning    boolean,
  cpc_increased  boolean,
  is_wasteful    boolean
)
language sql
stable
security invoker
as $$
  with campaign_first_seen as (
    select campaign_id, min(date) as first_date
    from fact_campaign_daily
    group by campaign_id
  ),
  current_metrics as (
    select
      f.campaign_id,
      sum(f.cost_ars)    as cost,
      sum(f.clicks)      as clicks,
      sum(f.conversions) as conversions
    from fact_campaign_daily f
    join dim_campaign c on c.id = f.campaign_id
    where f.date between p_from and p_to
      and (p_publisher is null or c.publisher::text = p_publisher)
      and (p_type      is null or c.type::text      = p_type)
    group by f.campaign_id
  ),
  prev_metrics as (
    select
      f.campaign_id,
      sum(f.cost_ars) as cost,
      sum(f.clicks)   as clicks
    from fact_campaign_daily f
    join dim_campaign c on c.id = f.campaign_id
    where p_prev_from is not null
      and p_prev_to   is not null
      and f.date between p_prev_from and p_prev_to
      and (p_publisher is null or c.publisher::text = p_publisher)
      and (p_type      is null or c.type::text      = p_type)
    group by f.campaign_id
  ),
  totals as (
    select
      sum(cost)        as total_cost,
      sum(conversions) as total_conversions,
      count(*)         as campaign_count
    from current_metrics
  )
  select
    cm.campaign_id,
    -- Aprendizaje: campaña con primer dato hace < 7 días desde el final
    -- del período. Refleja "campaña nueva en performance", no fecha de
    -- creación en GAds/Meta.
    coalesce(cfs.first_date >= (p_to - 7), false) as is_learning,
    -- CPC subió >50% vs período anterior. Si no hay período de
    -- comparación o no hay clicks en alguno de los dos, devolvemos false.
    case
      when cm.clicks > 0
       and pm.clicks > 0
       and pm.cost > 0
       and ((cm.cost::numeric / cm.clicks) / (pm.cost::numeric / pm.clicks)) > 1.5
      then true
      else false
    end as cpc_increased,
    -- Desperdicio: >30% del gasto, <10% de conversiones.
    -- Solo aplica si hay al menos 3 campañas (sino el "share" no tiene
    -- sentido — con 2 campañas, una siempre tiene ≥50% del gasto).
    case
      when t.campaign_count >= 3
       and t.total_cost > 0
       and t.total_conversions > 0
       and (cm.cost / t.total_cost) > 0.30
       and (cm.conversions / t.total_conversions) < 0.10
      then true
      else false
    end as is_wasteful
  from current_metrics cm
  left join campaign_first_seen cfs on cfs.campaign_id = cm.campaign_id
  left join prev_metrics pm         on pm.campaign_id  = cm.campaign_id
  cross join totals t;
$$;

grant execute on function dashboard_campaign_anomalies(date, date, date, date, text, text) to authenticated;
