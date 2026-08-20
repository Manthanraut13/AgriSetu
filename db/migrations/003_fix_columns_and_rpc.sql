-- ============================================================
-- Fix missing columns and create RPC function
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add missing column to weather_cache
ALTER TABLE weather_cache
  ADD COLUMN IF NOT EXISTS wind_speed_ms FLOAT;

-- 2. Add missing columns to farmers table if not present
ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS language_pref TEXT DEFAULT 'hi',
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'IN';

-- 3. Create the match_knowledge_base RPC function for pgvector similarity search
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(384),
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Verify everything
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'weather_cache'
ORDER BY ordinal_position;
