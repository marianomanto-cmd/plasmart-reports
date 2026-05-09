-- =====================================================================
-- v1.1 · Paso 2: Comparativa GAds vs Meta
-- RPC que devuelve totales agregados por publisher en el rango filtrado.
-- =====================================================================

create or replace function dashboard_publisher_comparison(
  p_from        date,
  p_to          date,
  p_type        text default null,
  p_campaign_id uuid default null
)
returns table (
  publisher   text,
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
    c.publisher::text                        as publisher,
    coalesce(sum(f.cost_ars), 0)::numeric    as cost,
    coalesce(sum(f.impressions), 0)::bigint  as impressions,
    coalesce(sum(f.clicks), 0)::bigint       as clicks,
    coalesce(sum(f.conversions), 0)::numeric as conversions
  from fact_campaign_daily f
  join dim_campaign c on c.id = f.campaign_id
  where f.date between p_from and p_to
    and (p_type        is null or c.type::text  = p_type)
    and (p_campaign_id is null or f.campaign_id = p_campaign_id)
  group by c.publisher
  order by c.publisher;
$$;

grant execute on function dashboard_publisher_comparison(date, date, text, uuid) to authenticated;
