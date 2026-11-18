-- Powered By Vistech Force
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS labels TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS mentions INT[] NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS task_checklist (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_checklist_task_idx ON task_checklist(task_id);
CREATE TABLE IF NOT EXISTS task_time (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS task_time_task_idx ON task_time(task_id);
CREATE TABLE IF NOT EXISTS task_notifs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INT NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_notifs_user_idx ON task_notifs(user_id, read);
