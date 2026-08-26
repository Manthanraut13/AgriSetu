-- db/init/01-extensions.sql
-- Runs automatically when PostGIS container starts for the first time.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Extensions enabled: postgis=%, vector=%',
    (SELECT extversion FROM pg_extension WHERE extname = 'postgis'),
    (SELECT extversion FROM pg_extension WHERE extname = 'vector');
END $$;
