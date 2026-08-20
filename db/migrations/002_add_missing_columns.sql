-- Add missing columns to farm_plots table
-- Run this in Supabase SQL Editor

ALTER TABLE farm_plots
  ADD COLUMN IF NOT EXISTS center_lat FLOAT,
  ADD COLUMN IF NOT EXISTS center_lon FLOAT,
  ADD COLUMN IF NOT EXISTS current_crop TEXT,
  ADD COLUMN IF NOT EXISTS last_crop TEXT;

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'farm_plots'
ORDER BY ordinal_position;
