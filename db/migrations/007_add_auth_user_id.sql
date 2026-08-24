-- 007: Add Supabase Auth user_id to farmers table
-- Links the Supabase Auth user to the farmer profile

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookup by user_id (used in auth flow)
CREATE INDEX IF NOT EXISTS idx_farmers_user_id ON farmers (user_id);

-- Unique constraint: one farmer per auth user
CREATE UNIQUE INDEX IF NOT EXISTS idx_farmers_user_id_unique ON farmers (user_id) WHERE user_id IS NOT NULL;
