-- Powered By Vistech Force
-- Many boards per project, each with its own custom columns.
CREATE TABLE IF NOT EXISTS project_boards (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_boards_project_idx ON project_boards(project_id, position);
CREATE TABLE IF NOT EXISTS board_cols (
  id SERIAL PRIMARY KEY,
  board_id INT NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  UNIQUE (board_id, key)
);
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS board_id INT REFERENCES project_boards(id) ON DELETE CASCADE;
