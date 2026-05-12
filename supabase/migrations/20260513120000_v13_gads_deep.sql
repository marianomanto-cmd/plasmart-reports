-- ============================================================
-- v1.3 · Profundización Google Ads
-- Ad groups + asset groups unificados, keywords, search terms,
-- geo por provincia.
-- ============================================================

-- ============================================================
-- TABLAS
-- ============================================================

create table public.dim_ad_group (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.dim_campaign(id) on delete cascade,
  external_id text not null,
  name text not null,
  group_type text not null check (group_type in ('ad_group', 'asset_group')),
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, external_id)
);

create index idx_dim_ad_group_campaign on public.dim_ad_group(campaign_id);

create table public.fact_ad_group_daily (
  date date not null,
  ad_group_id uuid not null references public.dim_ad_group(id) on delete cascade,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(10,2) not null default 0,
  cost_ars numeric(18,2) not null default 0,
  revenue_ars numeric(18,2) not null default 0,
  ctr numeric generated always as (
    case when impressions > 0 then clicks::numeric / impressions else 0 end
  ) stored,
  cpc numeric generated always as (
    case when clicks > 0 then cost_ars / clicks else 0 end
  ) stored,
  cpa numeric generated always as (
    case when conversions > 0 then cost_ars / conversions else 0 end
  ) stored,
  raw_payload jsonb,
  primary key (date, ad_group_id)
);

create index idx_fact_ad_group_date on public.fact_ad_group_daily(date);

create table public.dim_keyword (
  id uuid primary key default gen_random_uuid(),
  ad_group_id uuid not null references public.dim_ad_group(id) on delete cascade,
  external_id text not null,
  keyword_text text not null,
  match_type text not null check (match_type in ('EXACT', 'PHRASE', 'BROAD')),
  status text,
  quality_score smallint check (quality_score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ad_group_id, external_id)
);

create index idx_dim_keyword_ad_group on public.dim_keyword(ad_group_id);

create table public.fact_keyword_daily (
  date date not null,
  keyword_id uuid not null references public.dim_keyword(id) on delete cascade,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(10,2) not null default 0,
  cost_ars numeric(18,2) not null default 0,
  avg_position numeric(4,2),
  ctr numeric generated always as (
    case when impressions > 0 then clicks::numeric / impressions else 0 end
  ) stored,
  cpc numeric generated always as (
    case when clicks > 0 then cost_ars / clicks else 0 end
  ) stored,
  cpa numeric generated always as (
    case when conversions > 0 then cost_ars / conversions else 0 end
  ) stored,
  raw_payload jsonb,
  primary key (date, keyword_id)
);

create index idx_fact_keyword_date on public.fact_keyword_daily(date);

create table public.fact_search_term_daily (
  date date not null,
  ad_group_id uuid not null references public.dim_ad_group(id) on delete cascade,
  search_term text not null,
  matched_keyword_id uuid references public.dim_keyword(id) on delete set null,
  match_type text,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(10,2) not null default 0,
  cost_ars numeric(18,2) not null default 0,
  ctr numeric generated always as (
    case when impressions > 0 then clicks::numeric / impressions else 0 end
  ) stored,
  cpc numeric generated always as (
    case when clicks > 0 then cost_ars / clicks else 0 end
  ) stored,
  cpa numeric generated always as (
    case when conversions > 0 then cost_ars / conversions else 0 end
  ) stored,
  raw_payload jsonb,
  primary key (date, ad_group_id, search_term)
);

create index idx_fact_search_term_date on public.fact_search_term_daily(date);
create index idx_fact_search_term_waste
  on public.fact_search_term_daily(cost_ars desc)
  where conversions = 0 and cost_ars > 0;

create table public.fact_campaign_geo_daily (
  date date not null,
  campaign_id uuid not null references public.dim_campaign(id) on delete cascade,
  region_code text not null default 'unknown',  -- AR-X (ISO 3166-2)
  region_name text,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(10,2) not null default 0,
  cost_ars numeric(18,2) not null default 0,
  ctr numeric generated always as (
    case when impressions > 0 then clicks::numeric / impressions else 0 end
  ) stored,
  cpc numeric generated always as (
    case when clicks > 0 then cost_ars / clicks else 0 end
  ) stored,
  cpa numeric generated always as (
    case when conversions > 0 then cost_ars / conversions else 0 end
  ) stored,
  raw_payload jsonb,
  primary key (date, campaign_id, region_code)
);

create index idx_fact_geo_date on public.fact_campaign_geo_daily(date);

-- ============================================================
-- Row Level Security
-- Patrón replicado de 20260507220902_initial_schema.sql:
-- usuarios autenticados con email @transfil.com.ar pueden leer.
-- Las escrituras solo desde server-side con service_role key.
-- ============================================================

alter table public.dim_ad_group enable row level security;
alter table public.fact_ad_group_daily enable row level security;
alter table public.dim_keyword enable row level security;
alter table public.fact_keyword_daily enable row level security;
alter table public.fact_search_term_daily enable row level security;
alter table public.fact_campaign_geo_daily enable row level security;

create policy "Authenticated transfil users can read ad groups"
  on public.dim_ad_group for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

create policy "Authenticated transfil users can read ad group facts"
  on public.fact_ad_group_daily for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

create policy "Authenticated transfil users can read keywords"
  on public.dim_keyword for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

create policy "Authenticated transfil users can read keyword facts"
  on public.fact_keyword_daily for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

create policy "Authenticated transfil users can read search terms"
  on public.fact_search_term_daily for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

create policy "Authenticated transfil users can read geo"
  on public.fact_campaign_geo_daily for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

-- ============================================================
-- Vistas materializadas
-- ============================================================

create materialized view public.mv_ad_group_summary as
select
  ag.id as ad_group_id,
  ag.campaign_id,
  ag.name as ad_group_name,
  ag.group_type,
  c.name as campaign_name,
  c.publisher,
  f.date,
  f.impressions,
  f.clicks,
  f.conversions,
  f.cost_ars,
  f.ctr,
  f.cpc,
  f.cpa
from public.fact_ad_group_daily f
join public.dim_ad_group ag on ag.id = f.ad_group_id
join public.dim_campaign c on c.id = ag.campaign_id;

create unique index idx_mv_ad_group_summary_pk
  on public.mv_ad_group_summary(ad_group_id, date);
create index idx_mv_ad_group_summary_date on public.mv_ad_group_summary(date);
create index idx_mv_ad_group_summary_campaign on public.mv_ad_group_summary(campaign_id);

create materialized view public.mv_search_term_waste as
select
  st.ad_group_id,
  ag.campaign_id,
  c.name as campaign_name,
  ag.name as ad_group_name,
  st.search_term,
  st.match_type,
  sum(st.cost_ars) as total_cost,
  sum(st.impressions) as total_impressions,
  sum(st.clicks) as total_clicks,
  min(st.date) as first_seen,
  max(st.date) as last_seen
from public.fact_search_term_daily st
join public.dim_ad_group ag on ag.id = st.ad_group_id
join public.dim_campaign c on c.id = ag.campaign_id
where st.cost_ars > 0
group by st.ad_group_id, ag.campaign_id, c.name, ag.name,
         st.search_term, st.match_type
having sum(st.conversions) = 0;

create unique index idx_mv_search_term_waste_pk
  on public.mv_search_term_waste(ad_group_id, search_term, match_type);
create index idx_mv_search_term_waste_campaign on public.mv_search_term_waste(campaign_id);

create materialized view public.mv_geo_summary as
select
  g.campaign_id,
  c.name as campaign_name,
  g.region_code,
  g.region_name,
  g.date,
  g.impressions,
  g.clicks,
  g.conversions,
  g.cost_ars,
  g.ctr,
  g.cpc,
  g.cpa
from public.fact_campaign_geo_daily g
join public.dim_campaign c on c.id = g.campaign_id;

create unique index idx_mv_geo_summary_pk
  on public.mv_geo_summary(campaign_id, region_code, date);
create index idx_mv_geo_summary_date on public.mv_geo_summary(date);
create index idx_mv_geo_summary_campaign on public.mv_geo_summary(campaign_id);

-- ============================================================
-- refresh_all_materialized_views: extender con las 3 nuevas
-- preservando las 3 existentes del initial schema.
-- ============================================================

create or replace function public.refresh_all_materialized_views()
returns void
language plpgsql
security definer
as $$
begin
  -- Existentes (initial schema)
  refresh materialized view concurrently public.mv_campaign_weekly;
  refresh materialized view concurrently public.mv_campaign_monthly;
  refresh materialized view concurrently public.mv_publisher_summary;

  -- Nuevas v1.3
  refresh materialized view concurrently public.mv_ad_group_summary;
  refresh materialized view concurrently public.mv_search_term_waste;
  refresh materialized view concurrently public.mv_geo_summary;
end;
$$;

comment on function public.refresh_all_materialized_views is
  'Refresca las 6 vistas materializadas. Llamar al final de cada ingesta.';

-- ============================================================
-- RPCs para PR 5 (IA)
-- ============================================================

create or replace function public.top_wasted_search_terms(
  p_start date,
  p_end date,
  p_limit int default 5
)
returns table (
  campaign_name text,
  ad_group_name text,
  search_term text,
  match_type text,
  total_cost numeric,
  total_clicks bigint
)
language sql stable as $$
  select
    c.name,
    ag.name,
    st.search_term,
    st.match_type,
    sum(st.cost_ars)::numeric,
    sum(st.clicks)
  from public.fact_search_term_daily st
  join public.dim_ad_group ag on ag.id = st.ad_group_id
  join public.dim_campaign c on c.id = ag.campaign_id
  where st.date between p_start and p_end
    and st.cost_ars > 0
  group by c.name, ag.name, st.search_term, st.match_type
  having sum(st.conversions) = 0
  order by sum(st.cost_ars) desc
  limit p_limit;
$$;

create or replace function public.underperforming_ad_groups(
  p_start date,
  p_end date
)
returns table (
  campaign_name text,
  ad_group_name text,
  ad_group_ctr numeric,
  campaign_avg_ctr numeric,
  cost_ars numeric
)
language sql stable as $$
  with ag_metrics as (
    select
      ag.campaign_id,
      ag.id as ad_group_id,
      ag.name as ad_group_name,
      sum(f.impressions) as imp,
      sum(f.clicks) as clk,
      sum(f.cost_ars) as cost,
      case when sum(f.impressions) > 0
           then sum(f.clicks)::numeric / sum(f.impressions)
           else 0 end as ctr
    from public.fact_ad_group_daily f
    join public.dim_ad_group ag on ag.id = f.ad_group_id
    where f.date between p_start and p_end
    group by ag.campaign_id, ag.id, ag.name
  ),
  campaign_avg as (
    select
      campaign_id,
      avg(ctr) filter (where imp > 100) as avg_ctr
    from ag_metrics
    group by campaign_id
  )
  select
    c.name,
    m.ad_group_name,
    m.ctr,
    ca.avg_ctr,
    m.cost
  from ag_metrics m
  join campaign_avg ca on ca.campaign_id = m.campaign_id
  join public.dim_campaign c on c.id = m.campaign_id
  where m.ctr < ca.avg_ctr * 0.5
    and m.imp > 100
    and m.cost > 0
  order by m.cost desc;
$$;

create or replace function public.low_quality_keywords(
  p_start date,
  p_end date,
  p_min_cost numeric default 500
)
returns table (
  campaign_name text,
  ad_group_name text,
  keyword_text text,
  match_type text,
  quality_score smallint,
  total_cost numeric
)
language sql stable as $$
  select
    c.name,
    ag.name,
    k.keyword_text,
    k.match_type,
    k.quality_score,
    sum(f.cost_ars)::numeric
  from public.fact_keyword_daily f
  join public.dim_keyword k on k.id = f.keyword_id
  join public.dim_ad_group ag on ag.id = k.ad_group_id
  join public.dim_campaign c on c.id = ag.campaign_id
  where f.date between p_start and p_end
    and k.quality_score is not null
    and k.quality_score < 5
  group by c.name, ag.name, k.keyword_text, k.match_type, k.quality_score
  having sum(f.cost_ars) >= p_min_cost
  order by sum(f.cost_ars) desc;
$$;

create or replace function public.geo_outliers(
  p_start date,
  p_end date
)
returns table (
  campaign_name text,
  region_name text,
  region_cpa numeric,
  national_avg_cpa numeric,
  cost_ars numeric,
  conversions numeric
)
language sql stable as $$
  with by_region as (
    select
      g.campaign_id,
      g.region_code,
      g.region_name,
      sum(g.cost_ars) as cost,
      sum(g.conversions) as conv,
      case when sum(g.conversions) > 0
           then sum(g.cost_ars) / sum(g.conversions)
           else null end as cpa
    from public.fact_campaign_geo_daily g
    where g.date between p_start and p_end
    group by g.campaign_id, g.region_code, g.region_name
  ),
  national as (
    select
      campaign_id,
      sum(cost) / nullif(sum(conv), 0) as avg_cpa
    from by_region
    group by campaign_id
  )
  select
    c.name,
    r.region_name,
    r.cpa,
    n.avg_cpa,
    r.cost,
    r.conv
  from by_region r
  join national n on n.campaign_id = r.campaign_id
  join public.dim_campaign c on c.id = r.campaign_id
  where r.cpa is not null
    and n.avg_cpa is not null
    and r.cpa > n.avg_cpa * 2
    and r.cost > 0
  order by r.cost desc;
$$;

grant execute on function public.top_wasted_search_terms to authenticated;
grant execute on function public.underperforming_ad_groups to authenticated;
grant execute on function public.low_quality_keywords to authenticated;
grant execute on function public.geo_outliers to authenticated;
