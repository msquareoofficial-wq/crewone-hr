-- Powered By Vistech Force
ALTER TABLE breaks ADD COLUMN IF NOT EXISTS category TEXT;
CREATE INDEX IF NOT EXISTS breaks_cat_idx ON breaks (work_date, category);
