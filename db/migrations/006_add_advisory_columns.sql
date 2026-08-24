-- 006: Add missing columns to advisories table
-- These columns were defined in 001_initial_schema.sql but the table
-- already existed in the live DB, so CREATE TABLE IF NOT EXISTS skipped them.

ALTER TABLE advisories ADD COLUMN IF NOT EXISTS risk_alerts TEXT[];
ALTER TABLE advisories ADD COLUMN IF NOT EXISTS raw_input_snapshot JSONB;
