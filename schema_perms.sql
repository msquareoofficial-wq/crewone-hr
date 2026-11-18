-- Powered By Vistech Force
ALTER TABLE users ADD COLUMN IF NOT EXISTS perms TEXT[] NOT NULL DEFAULT '{}';
