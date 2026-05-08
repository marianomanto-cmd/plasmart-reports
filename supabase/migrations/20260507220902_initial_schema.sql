-- ============================================================
-- Plasmart Reports — Esquema inicial
-- ============================================================
-- Tablas de hechos (fact_) y dimensiones (dim_) para reportería
-- de campañas de Google Ads, Meta Ads y Google Analytics 4.
-- ============================================================

-- Limpieza por si la migration se reaplica en un entorno limpio
DROP MATERIALIZED VIEW IF EXISTS mv_publisher_summary;
DROP MATERIALIZED VIEW IF EXISTS mv_campaign_monthly;
DROP MATERIALIZED VIEW IF EXISTS mv_campaign_weekly;
DROP TABLE IF EXISTS ai_analysis_cache;
DROP TABLE IF EXISTS ingestion_log;
DROP TABLE IF EXISTS fact_ga_daily;
DROP TABLE IF EXISTS fact_campaign_daily;
DROP TABLE IF EXISTS dim_campaign;
DROP TYPE IF EXISTS campaign_publisher;
DROP TYPE IF EXISTS campaign_type;
DROP TYPE IF EXISTS campaign_status;

-- ============================================================
-- Tipos enum
-- ============================================================

CREATE TYPE campaign_publisher AS ENUM ('gads', 'meta');

CREATE TYPE campaign_type AS ENUM (
  'search',
  'display',
  'video',
  'pmax',
  'demand_gen',
  'shopping',
  'app',
  'social',
  'reach',
  'awareness',
  'engagement',
  'sales',
  'leads',
  'traffic',
  'other'
);

CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'ended');

-- ============================================================
-- dim_campaign — dimensión de campañas
-- ============================================================

CREATE TABLE dim_campaign (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher campaign_publisher NOT NULL,
  external_id text NOT NULL,
  name text NOT NULL,
  type campaign_type NOT NULL DEFAULT 'other',
  type_raw text,
  status campaign_status NOT NULL DEFAULT 'active',
  status_raw text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publisher, external_id)
);

CREATE INDEX idx_dim_campaign_publisher ON dim_campaign (publisher);
CREATE INDEX idx_dim_campaign_status ON dim_campaign (status);

COMMENT ON TABLE dim_campaign IS 'Dimensión: una fila por campaña única (clave: publisher + external_id)';
COMMENT ON COLUMN dim_campaign.type_raw IS 'Tipo crudo como vino del publisher (ej: PERFORMANCE_MAX, OUTCOME_SALES)';
COMMENT ON COLUMN dim_campaign.status_raw IS 'Estado crudo como vino del publisher (ej: ENABLED, PAUSED)';

-- ============================================================
-- fact_campaign_daily — hechos diarios de campañas
-- ============================================================

CREATE TABLE fact_campaign_daily (
  date date NOT NULL,
  campaign_id uuid NOT NULL REFERENCES dim_campaign(id) ON DELETE CASCADE,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  conversions numeric(12, 4) NOT NULL DEFAULT 0,
  cost_ars numeric(18, 2) NOT NULL DEFAULT 0,
  revenue_ars numeric(18, 2) NOT NULL DEFAULT 0,
  ctr numeric(8, 4) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN (clicks::numeric / impressions) ELSE 0 END
  ) STORED,
  cpc numeric(18, 4) GENERATED ALWAYS AS (
    CASE WHEN clicks > 0 THEN (cost_ars / clicks) ELSE 0 END
  ) STORED,
  cpa numeric(18, 4) GENERATED ALWAYS AS (
    CASE WHEN conversions > 0 THEN (cost_ars / conversions) ELSE 0 END
  ) STORED,
  roas numeric(18, 4) GENERATED ALWAYS AS (
    CASE WHEN cost_ars > 0 THEN (revenue_ars / cost_ars) ELSE 0 END
  ) STORED,
  raw_payload jsonb,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, campaign_id)
);

CREATE INDEX idx_fact_campaign_daily_date ON fact_campaign_daily (date DESC);
CREATE INDEX idx_fact_campaign_daily_campaign ON fact_campaign_daily (campaign_id);

COMMENT ON TABLE fact_campaign_daily IS 'Hechos: 1 fila por campaña por día. CTR/CPC/CPA/ROAS calculadas';

-- ============================================================
-- fact_ga_daily — hechos diarios de Google Analytics 4
-- ============================================================

CREATE TABLE fact_ga_daily (
  date date NOT NULL,
  source text NOT NULL,
  medium text NOT NULL,
  sessions bigint NOT NULL DEFAULT 0,
  total_users bigint NOT NULL DEFAULT 0,
  new_users bigint NOT NULL DEFAULT 0,
  page_views bigint NOT NULL DEFAULT 0,
  key_events numeric(12, 4) NOT NULL DEFAULT 0,
  avg_session_duration numeric(10, 2) NOT NULL DEFAULT 0,
  bounce_rate numeric(6, 4) NOT NULL DEFAULT 0,
  raw_payload jsonb,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, source, medium)
);

CREATE INDEX idx_fact_ga_daily_date ON fact_ga_daily (date DESC);

COMMENT ON TABLE fact_ga_daily IS 'Hechos GA4: 1 fila por día × source × medium';

-- ============================================================
-- ai_analysis_cache — cache de respuestas de Claude
-- ============================================================

CREATE TABLE ai_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filters_hash text NOT NULL,
  data_max_date date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model_used text NOT NULL,
  prompt_tokens int,
  completion_tokens int,
  content text NOT NULL,
  UNIQUE (filters_hash, data_max_date)
);

CREATE INDEX idx_ai_analysis_cache_lookup ON ai_analysis_cache (filters_hash, data_max_date);

COMMENT ON TABLE ai_analysis_cache IS 'Cache de análisis de Claude. Clave: hash de filtros + última fecha de datos';

-- ============================================================
-- ingestion_log — log de ejecuciones de ingesta
-- ============================================================

CREATE TABLE ingestion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  file_name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  rows_inserted int,
  rows_updated int,
  status text NOT NULL,
  error_message text,
  CHECK (status IN ('success', 'partial', 'failed', 'running'))
);

CREATE INDEX idx_ingestion_log_started ON ingestion_log (started_at DESC);
CREATE INDEX idx_ingestion_log_status ON ingestion_log (status);

COMMENT ON TABLE ingestion_log IS 'Log de cada ejecución de ingest-reports, para diagnosticar fallos';

-- ============================================================
-- Vistas materializadas para el dashboard
-- ============================================================

CREATE MATERIALIZED VIEW mv_campaign_weekly AS
SELECT
  date_trunc('week', date)::date AS week_start,
  campaign_id,
  c.publisher,
  c.name AS campaign_name,
  c.type AS campaign_type,
  SUM(impressions) AS impressions,
  SUM(clicks) AS clicks,
  SUM(conversions) AS conversions,
  SUM(cost_ars) AS cost_ars,
  SUM(revenue_ars) AS revenue_ars
FROM fact_campaign_daily f
JOIN dim_campaign c ON c.id = f.campaign_id
GROUP BY 1, 2, c.publisher, c.name, c.type;

CREATE UNIQUE INDEX idx_mv_campaign_weekly ON mv_campaign_weekly (week_start, campaign_id);

CREATE MATERIALIZED VIEW mv_campaign_monthly AS
SELECT
  date_trunc('month', date)::date AS month_start,
  campaign_id,
  c.publisher,
  c.name AS campaign_name,
  c.type AS campaign_type,
  SUM(impressions) AS impressions,
  SUM(clicks) AS clicks,
  SUM(conversions) AS conversions,
  SUM(cost_ars) AS cost_ars,
  SUM(revenue_ars) AS revenue_ars
FROM fact_campaign_daily f
JOIN dim_campaign c ON c.id = f.campaign_id
GROUP BY 1, 2, c.publisher, c.name, c.type;

CREATE UNIQUE INDEX idx_mv_campaign_monthly ON mv_campaign_monthly (month_start, campaign_id);

CREATE MATERIALIZED VIEW mv_publisher_summary AS
SELECT
  c.publisher,
  date_trunc('month', f.date)::date AS month_start,
  SUM(f.impressions) AS impressions,
  SUM(f.clicks) AS clicks,
  SUM(f.conversions) AS conversions,
  SUM(f.cost_ars) AS cost_ars,
  SUM(f.revenue_ars) AS revenue_ars
FROM fact_campaign_daily f
JOIN dim_campaign c ON c.id = f.campaign_id
GROUP BY 1, 2;

CREATE UNIQUE INDEX idx_mv_publisher_summary ON mv_publisher_summary (publisher, month_start);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
-- Activamos RLS en todas las tablas.
-- Por ahora, política simple: cualquier usuario autenticado
-- con email @transfil.com.ar puede leer.
-- Las escrituras solo desde server-side con service_role key.

ALTER TABLE dim_campaign ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_campaign_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_ga_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated transfil users can read campaigns"
  ON dim_campaign FOR SELECT
  TO authenticated
  USING (auth.email() LIKE '%@transfil.com.ar');

CREATE POLICY "Authenticated transfil users can read facts"
  ON fact_campaign_daily FOR SELECT
  TO authenticated
  USING (auth.email() LIKE '%@transfil.com.ar');

CREATE POLICY "Authenticated transfil users can read ga4"
  ON fact_ga_daily FOR SELECT
  TO authenticated
  USING (auth.email() LIKE '%@transfil.com.ar');

CREATE POLICY "Authenticated transfil users can read ai cache"
  ON ai_analysis_cache FOR SELECT
  TO authenticated
  USING (auth.email() LIKE '%@transfil.com.ar');

CREATE POLICY "Authenticated transfil users can read ingestion log"
  ON ingestion_log FOR SELECT
  TO authenticated
  USING (auth.email() LIKE '%@transfil.com.ar');

-- ============================================================
-- Función auxiliar: refrescar todas las vistas materializadas
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_weekly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_monthly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_publisher_summary;
END;
$$;

COMMENT ON FUNCTION refresh_all_materialized_views IS 'Refresca las 3 vistas materializadas. Llamar al final de cada ingesta';