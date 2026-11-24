-- Powered By Vistech Force
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS remind_minutes INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS calendar_reminders_sent (
  event_id    INT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  instance_dt TIMESTAMPTZ NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, instance_dt)
);
CREATE INDEX IF NOT EXISTS idx_remind_sent_event ON calendar_reminders_sent(event_id);
