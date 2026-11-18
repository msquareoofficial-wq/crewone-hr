-- Powered By Vistech Force
-- Finance sheet: one row per salary line, office expense line or other spending line, per month.
CREATE TABLE IF NOT EXISTS finance_items (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  section TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  dept TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  get_amt NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission NUMERIC(14,2) NOT NULL DEFAULT 0,
  spent_on TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_items_month ON finance_items(month, section, sort_order);
CREATE TABLE IF NOT EXISTS finance_months (
  month TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
