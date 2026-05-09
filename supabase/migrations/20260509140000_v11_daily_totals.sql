-- =====================================================================
-- v1.1 · Paso 5: Totales diarios para sparklines
-- Devuelve los 4 KPIs agregados por día (no por publisher).
-- =====================================================================

create or replace function dashboard_daily_totals(
  p_from        date,
  p_to          date,
  p_publisher   text default null,
  p_type        text default null,
  p_campaign_id uuid default null
)
returns table (
  date        date,
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
    f.date,
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
  group by f.date
  order by f.date asc;
$$;

grant execute on function dashboard_daily_totals(date, date, text, text, uuid) to authenticated;
