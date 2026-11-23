CREATE TABLE IF NOT EXISTS calendar_events (
  id          SERIAL PRIMARY KEY,
  created_by  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  start_dt    TIMESTAMPTZ NOT NULL,
  end_dt      TIMESTAMPTZ NOT NULL,
  color       TEXT NOT NULL DEFAULT '#4f46e5',
  all_day     BOOLEAN NOT NULL DEFAULT FALSE,
  visibility  TEXT NOT NULL DEFAULT 'personal' CHECK (visibility IN ('personal','team'))
);
CREATE INDEX IF NOT EXISTS idx_cal_ev_user ON calendar_events(created_by, start_dt);
CREATE INDEX IF NOT EXISTS idx_cal_ev_time ON calendar_events(start_dt, end_dt);
