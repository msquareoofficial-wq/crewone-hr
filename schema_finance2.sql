-- Powered By Vistech Force
-- Finance: paid status per line.
ALTER TABLE finance_items ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_items ADD COLUMN IF NOT EXISTS paid_on TEXT;
ALTER TABLE finance_items ADD COLUMN IF NOT EXISTS get_manual BOOLEAN NOT NULL DEFAULT FALSE;
