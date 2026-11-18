-- Powered By Vistech Force
ALTER TABLE users ADD COLUMN IF NOT EXISTS shift_type TEXT NOT NULL DEFAULT 'fixed';
