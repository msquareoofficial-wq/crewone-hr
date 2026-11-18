-- Powered By Vistech Force
CREATE TABLE IF NOT EXISTS activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_time_idx ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_user_idx ON activity_log (user_id, created_at DESC);
