-- Add missing columns to weather_cache and soil_data
-- Run this in Supabase SQL Editor

-- Weather: add missing columns
ALTER TABLE weather_cache ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE weather_cache ADD COLUMN IF NOT EXISTS source TEXT;

-- Soil: add missing columns
ALTER TABLE soil_data ADD COLUMN IF NOT EXISTS source TEXT;

-- NDVI: ensure columns exist
ALTER TABLE ndvi_snapshots ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Sentinel-2';

-- Fix disease_reports plot_id to allow NULL (for standalone diagnoses)
ALTER TABLE disease_reports ALTER COLUMN plot_id DROP NOT NULL;
