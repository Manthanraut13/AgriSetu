-- ============================================================
-- AgriSetu — Initial Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT PostGIS_version();
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 2. Farmers Table
-- ============================================================
CREATE TABLE IF NOT EXISTS farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  language_pref TEXT DEFAULT 'hi',
  country_code TEXT DEFAULT 'IN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Farm Plots Table (PostGIS geometry)
-- ============================================================
CREATE TABLE IF NOT EXISTS farm_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  boundary GEOMETRY(POLYGON, 4326),
  center_lat FLOAT,
  center_lon FLOAT,
  area_ha FLOAT,
  district TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  current_crop TEXT,
  last_crop TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for farm_plots
CREATE INDEX IF NOT EXISTS idx_farm_plots_boundary ON farm_plots USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_farm_plots_farmer_id ON farm_plots (farmer_id);

-- 4. Soil Data Table
-- ============================================================
CREATE TABLE IF NOT EXISTS soil_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE CASCADE,
  N FLOAT,
  P FLOAT,
  K FLOAT,
  pH FLOAT,
  moisture_pct FLOAT,
  organic_carbon_pct FLOAT,
  source TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soil_data_plot_id ON soil_data (plot_id);

-- 5. NDVI Snapshots Table
-- ============================================================
CREATE TABLE IF NOT EXISTS ndvi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE CASCADE,
  ndvi FLOAT,
  ndmi FLOAT,
  image_date DATE,
  source TEXT DEFAULT 'Sentinel-2',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ndvi_snapshots_plot_id ON ndvi_snapshots (plot_id);

-- 6. Weather Cache Table
-- ============================================================
CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE CASCADE,
  temp_c FLOAT,
  humidity_pct FLOAT,
  rainfall_mm FLOAT,
  wind_speed_ms FLOAT,
  forecast_json JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_plot_id ON weather_cache (plot_id);

-- 7. Advisories Table
-- ============================================================
CREATE TABLE IF NOT EXISTS advisories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE CASCADE,
  recommended_crop TEXT,
  confidence FLOAT,
  sowing_window TEXT,
  irrigation_schedule TEXT,
  regenerative_practices TEXT[],
  risk_alerts TEXT[],
  raw_input_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisories_plot_id ON advisories (plot_id);

-- 8. Disease Reports Table
-- ============================================================
CREATE TABLE IF NOT EXISTS disease_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE SET NULL,
  disease_name TEXT NOT NULL,
  confidence FLOAT,
  treatment TEXT,
  organic_remedy TEXT,
  severity TEXT,
  image_url TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disease_reports_plot_id ON disease_reports (plot_id);

-- 9. Chat Sessions Table
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'web_chat',
  messages JSONB[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_farmer_id ON chat_sessions (farmer_id);

-- 10. Knowledge Base Table (pgvector for RAG)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(384),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base
  USING hnsw (embedding vector_cosine_ops);

-- 11. Row Level Security (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE soil_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ndvi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisories ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Farmers: can only read/update their own profile
CREATE POLICY "farmers_own_profile" ON farmers
  FOR ALL USING (id = auth.uid());

-- Farm plots: farmers can only see their own plots
CREATE POLICY "farmers_own_plots" ON farm_plots
  FOR ALL USING (farmer_id = auth.uid());

-- Soil data: linked through plot ownership
CREATE POLICY "farmers_own_soil" ON soil_data
  FOR ALL USING (
    plot_id IN (SELECT id FROM farm_plots WHERE farmer_id = auth.uid())
  );

-- NDVI: linked through plot ownership
CREATE POLICY "farmers_own_ndvi" ON ndvi_snapshots
  FOR ALL USING (
    plot_id IN (SELECT id FROM farm_plots WHERE farmer_id = auth.uid())
  );

-- Weather: linked through plot ownership
CREATE POLICY "farmers_own_weather" ON weather_cache
  FOR ALL USING (
    plot_id IN (SELECT id FROM farm_plots WHERE farmer_id = auth.uid())
  );

-- Advisories: linked through plot ownership
CREATE POLICY "farmers_own_advisories" ON advisories
  FOR ALL USING (
    plot_id IN (SELECT id FROM farm_plots WHERE farmer_id = auth.uid())
  );

-- Disease reports: linked through plot ownership
CREATE POLICY "farmers_own_diseases" ON disease_reports
  FOR ALL USING (
    plot_id IN (SELECT id FROM farm_plots WHERE farmer_id = auth.uid())
  );

-- Chat sessions: farmers can only see their own sessions
CREATE POLICY "farmers_own_sessions" ON chat_sessions
  FOR ALL USING (farmer_id = auth.uid());

-- Knowledge base: service role only (backend reads via service key)
CREATE POLICY "service_role_kb" ON knowledge_base
  FOR ALL USING (true);

-- ============================================================
-- NOTE: During prototype, the backend uses SUPABASE_SERVICE_KEY
-- which bypasses RLS. RLS is enabled so it's ready for
-- production when Supabase Auth JWT is used on every request.
-- ============================================================

-- 12. Supabase Storage Bucket
-- ============================================================
-- Run this via Supabase Dashboard > Storage > New Bucket:
-- Bucket name: disease-images
-- Public: false (authenticated read/write only)
