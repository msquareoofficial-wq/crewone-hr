-- Powered By Vistech Force
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS mentions INT[] NOT NULL DEFAULT '{}';
