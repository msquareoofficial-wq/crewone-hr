ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none','daily','weekly','monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_until DATE;
