-- ============================================================
-- Plasmart Reports — Adsets y Ads para Google Ads (v1.4)
-- ============================================================
-- Extiende el modelo de datos a tres niveles para Google Ads:
--   - dim_campaign  (ya existía)
--   - dim_adset     (nuevo, FK a dim_campaign)
--   - dim_ad        (nuevo, FK a dim_adset)
-- + tablas de hechos diarios paralelas: fact_adset_daily, fact_ad_daily.
--
-- Meta queda fuera del scope: la granularidad para Meta sigue siendo a
-- nivel campaña. Si en el futuro se incorpora, agregar un publisher al
-- enum y dejar campaign_id como pivot.
--
-- Esta migration es ADITIVA: no toca dim_campaign ni fact_campaign_daily.
-- Si la corrés sin tener data de adset/ad ingestada, las tablas quedan
-- vacías y el dashboard sigue funcionando exactamente igual a campaña.
-- ============================================================

-- ============================================================
-- dim_adset — dimensión de ad groups / ad sets
-- ============================================================

CREATE TABLE IF NOT EXISTS dim_adset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES dim_campaign(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  status campaign_status NOT NULL DEFAULT 'active',
  status_raw text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_dim_adset_campaign ON dim_adset (campaign_id);
CREATE INDEX IF NOT EXISTS idx_dim_adset_status ON dim_adset (status);

COMMENT ON TABLE dim_adset IS
  'Dimensión: ad group (Google Ads). Clave de negocio: (campaign_id, external_id)';

-- ============================================================
-- dim_ad — dimensión de creatives / ads individuales
-- ============================================================

CREATE TABLE IF NOT EXISTS dim_ad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adset_id uuid NOT NULL REFERENCES dim_adset(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  status campaign_status NOT NULL DEFAULT 'active',
  status_raw text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (adset_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_dim_ad_adset ON dim_ad (adset_id);
CREATE INDEX IF NOT EXISTS idx_dim_ad_status ON dim_ad (status);

COMMENT ON TABLE dim_ad IS
  'Dimensión: ad (creative individual). Clave de negocio: (adset_id, external_id)';

-- ============================================================
-- fact_adset_daily — hechos diarios a nivel ad group
-- ============================================================

CREATE TABLE IF NOT EXISTS fact_adset_daily (
  date date NOT NULL,
  adset_id uuid NOT NULL REFERENCES dim_adset(id) ON DELETE CASCADE,
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
  PRIMARY KEY (date, adset_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_adset_daily_date ON fact_adset_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_fact_adset_daily_adset ON fact_adset_daily (adset_id);

COMMENT ON TABLE fact_adset_daily IS
  'Hechos diarios a nivel ad group. Métricas derivadas calculadas.';

-- ============================================================
-- fact_ad_daily — hechos diarios a nivel ad individual
-- ============================================================

CREATE TABLE IF NOT EXISTS fact_ad_daily (
  date date NOT NULL,
  ad_id uuid NOT NULL REFERENCES dim_ad(id) ON DELETE CASCADE,
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
  PRIMARY KEY (date, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_ad_daily_date ON fact_ad_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_fact_ad_daily_ad ON fact_ad_daily (ad_id);

COMMENT ON TABLE fact_ad_daily IS
  'Hechos diarios a nivel ad individual. Métricas derivadas calculadas.';

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE dim_adset ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_ad ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_adset_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_ad_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated transfil users can read adsets"
  ON dim_adset FOR SELECT
  TO authenticated
  USING (auth.email() LIKE '%@transfil.com.ar');

CREATE POLICY "Authenticated transfil users can read ads"
  ON dim_ad FOR SELECT
  TO authenticated
  USING (auth.email() LIKE '%@transfil.com.ar');

CREATE POLICY "Authenticated transfil users can read adset facts"
  ON fact_adset_daily FOR SELECT
  TO authenticated
  USING (auth.email() LIKE '%@transfil.com.ar');

CREATE POLICY "Authenticated transfil users can read ad facts"
  ON fact_ad_daily FOR SELECT
  TO authenticated
  USING (auth.email() LIKE '%@transfil.com.ar');

-- ============================================================
-- RPCs: rows agregados por adset y por ad, mismos parámetros y shape
-- que dashboard_campaign_rows (publisher se filtra via campaign).
-- ============================================================

CREATE OR REPLACE FUNCTION dashboard_adset_rows(
  p_from date,
  p_to date,
  p_publisher campaign_publisher DEFAULT NULL,
  p_type campaign_type DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_limit int DEFAULT NULL
)
RETURNS TABLE (
  adset_id uuid,
  adset_name text,
  campaign_id uuid,
  campaign_name text,
  publisher campaign_publisher,
  type campaign_type,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  ctr numeric,
  cpc numeric,
  cpa numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id AS adset_id,
    a.name AS adset_name,
    c.id AS campaign_id,
    c.name AS campaign_name,
    c.publisher,
    c.type,
    COALESCE(SUM(f.cost_ars), 0) AS cost,
    COALESCE(SUM(f.impressions), 0)::bigint AS impressions,
    COALESCE(SUM(f.clicks), 0)::bigint AS clicks,
    COALESCE(SUM(f.conversions), 0) AS conversions,
    CASE WHEN SUM(f.impressions) > 0
         THEN SUM(f.clicks)::numeric / SUM(f.impressions)
         ELSE 0 END AS ctr,
    CASE WHEN SUM(f.clicks) > 0
         THEN SUM(f.cost_ars) / SUM(f.clicks)
         ELSE 0 END AS cpc,
    CASE WHEN SUM(f.conversions) > 0
         THEN SUM(f.cost_ars) / SUM(f.conversions)
         ELSE 0 END AS cpa
  FROM fact_adset_daily f
  JOIN dim_adset a ON a.id = f.adset_id
  JOIN dim_campaign c ON c.id = a.campaign_id
  WHERE f.date BETWEEN p_from AND p_to
    AND (p_publisher IS NULL OR c.publisher = p_publisher)
    AND (p_type IS NULL OR c.type = p_type)
    AND (p_campaign_id IS NULL OR c.id = p_campaign_id)
  GROUP BY a.id, a.name, c.id, c.name, c.publisher, c.type
  ORDER BY cost DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION dashboard_ad_rows(
  p_from date,
  p_to date,
  p_publisher campaign_publisher DEFAULT NULL,
  p_type campaign_type DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_limit int DEFAULT NULL
)
RETURNS TABLE (
  ad_id uuid,
  ad_name text,
  adset_id uuid,
  adset_name text,
  campaign_id uuid,
  campaign_name text,
  publisher campaign_publisher,
  type campaign_type,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  ctr numeric,
  cpc numeric,
  cpa numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ad.id AS ad_id,
    ad.name AS ad_name,
    a.id AS adset_id,
    a.name AS adset_name,
    c.id AS campaign_id,
    c.name AS campaign_name,
    c.publisher,
    c.type,
    COALESCE(SUM(f.cost_ars), 0) AS cost,
    COALESCE(SUM(f.impressions), 0)::bigint AS impressions,
    COALESCE(SUM(f.clicks), 0)::bigint AS clicks,
    COALESCE(SUM(f.conversions), 0) AS conversions,
    CASE WHEN SUM(f.impressions) > 0
         THEN SUM(f.clicks)::numeric / SUM(f.impressions)
         ELSE 0 END AS ctr,
    CASE WHEN SUM(f.clicks) > 0
         THEN SUM(f.cost_ars) / SUM(f.clicks)
         ELSE 0 END AS cpc,
    CASE WHEN SUM(f.conversions) > 0
         THEN SUM(f.cost_ars) / SUM(f.conversions)
         ELSE 0 END AS cpa
  FROM fact_ad_daily f
  JOIN dim_ad ad ON ad.id = f.ad_id
  JOIN dim_adset a ON a.id = ad.adset_id
  JOIN dim_campaign c ON c.id = a.campaign_id
  WHERE f.date BETWEEN p_from AND p_to
    AND (p_publisher IS NULL OR c.publisher = p_publisher)
    AND (p_type IS NULL OR c.type = p_type)
    AND (p_campaign_id IS NULL OR c.id = p_campaign_id)
  GROUP BY ad.id, ad.name, a.id, a.name, c.id, c.name, c.publisher, c.type
  ORDER BY cost DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION dashboard_adset_rows TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_ad_rows TO authenticated;

COMMENT ON FUNCTION dashboard_adset_rows IS
  'Filas agregadas a nivel ad group para el rango/filtros. Misma shape que dashboard_campaign_rows + campaign metadata.';
COMMENT ON FUNCTION dashboard_ad_rows IS
  'Filas agregadas a nivel ad para el rango/filtros. Incluye campaign y adset metadata.';
