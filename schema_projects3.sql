-- Powered By Vistech Force
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS recur TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS blocked_by INT[] NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS task_activity (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_activity_task_idx ON task_activity(task_id, id);
