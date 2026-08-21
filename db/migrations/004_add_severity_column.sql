-- Add missing severity column to disease_reports
ALTER TABLE disease_reports ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'moderate';
