-- Powered By Vistech Force
-- User status, chat replies and reactions.
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_text TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to INT REFERENCES chat_messages(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS chat_reactions (
  message_id INT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id)
);
