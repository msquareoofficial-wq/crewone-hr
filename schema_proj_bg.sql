-- Powered By Vistech Force
-- Per-user project board background (each person customises their own view).
CREATE TABLE IF NOT EXISTS project_prefs (
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bg TEXT,
  PRIMARY KEY (project_id, user_id)
);
