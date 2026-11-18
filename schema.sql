-- Powered By Vistech Force
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('timezone', 'Asia/Karachi'),
  ('grace_minutes', '30'),
  ('lates_per_off', '3')
ON CONFLICT (key) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS emp_seq START 1;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  emp_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  name TEXT NOT NULL,
  pseudo_name TEXT,
  phone TEXT,
  office_phone TEXT,
  email TEXT UNIQUE NOT NULL,
  office_email TEXT,
  pseudo_email TEXT,
  cnic TEXT,
  joining_date TEXT,
  department TEXT CHECK (department IN ('Sales','Production')),
  shift_start TEXT NOT NULL DEFAULT '09:00',
  shift_end TEXT NOT NULL DEFAULT '17:00',
  picture TEXT,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date TEXT NOT NULL,
  sign_in TIMESTAMPTZ NOT NULL,
  sign_out TIMESTAMPTZ,
  ip TEXT,
  late BOOLEAN NOT NULL DEFAULT FALSE,
  late_minutes INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, work_date)
);

CREATE TABLE IF NOT EXISTS breaks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date TEXT NOT NULL,
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_att_user_date ON attendance(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_breaks_user_date ON breaks(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, work_date);

-- Phase 2
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','Sales','Production')),
  kind TEXT NOT NULL DEFAULT 'update' CHECK (kind IN ('update','holiday')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_comments (
  id SERIAL PRIMARY KEY,
  notification_id INT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  holiday_date TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  notification_id INT REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_notif ON notification_comments(notification_id);
CREATE INDEX IF NOT EXISTS idx_leave_user ON leave_requests(user_id, start_date);

-- Phase 3: presence + chat
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS chat_rooms (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('dm','group')),
  name TEXT,
  dm_key TEXT UNIQUE,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_members (
  room_id INT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_id INT NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INT,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_room ON chat_messages(room_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);

CREATE TABLE IF NOT EXISTS chat_files (
  id SERIAL PRIMARY KEY,
  uploader_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size INT NOT NULL,
  mime TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_file_chunks (
  file_id INT NOT NULL REFERENCES chat_files(id) ON DELETE CASCADE,
  idx INT NOT NULL,
  data BYTEA NOT NULL,
  PRIMARY KEY (file_id, idx)
);

-- Phase 4: payroll
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS payroll (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  working_days INT NOT NULL DEFAULT 0,
  present_days INT NOT NULL DEFAULT 0,
  leave_days INT NOT NULL DEFAULT 0,
  absent_days INT NOT NULL DEFAULT 0,
  late_count INT NOT NULL DEFAULT 0,
  absent_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  late_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  manual BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft',
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
INSERT INTO settings (key, value) VALUES ('weekly_off','0'), ('leaves_paid','1') ON CONFLICT (key) DO NOTHING;
