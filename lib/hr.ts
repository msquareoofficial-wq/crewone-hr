// Powered By Vistech Force
import { q, q1, getSettings } from "./db";
import { localParts, minutesLate } from "./time";
import { autoCloseStale } from "./missedout";

export async function markAttendance(user: { id: number; shift_start: string; shift_type?: string; grace_minutes?: number | null }, ip: string) {
  const s = await getSettings();
  const grace = user.grace_minutes ?? s.grace_minutes;
  const now = new Date();
  const lp = localParts(now, s.timezone);
  const existing = await q1("SELECT id FROM attendance WHERE user_id=$1 AND work_date=$2", [user.id, lp.date]);
  if (existing) return { created: false };
  // close any breaks/tasks left open from an earlier day (user never clicked OUT)
  await q("UPDATE breaks SET end_at=start_at WHERE user_id=$1 AND end_at IS NULL AND work_date<>$2", [user.id, lp.date]);
  await q("UPDATE tasks SET end_at=start_at WHERE user_id=$1 AND end_at IS NULL AND work_date<>$2", [user.id, lp.date]);
  const diff = minutesLate(lp.minutes, user.shift_start);
  const late = user.shift_type !== "hybrid" && diff >= grace;
  await q(
    `INSERT INTO attendance (user_id, work_date, sign_in, ip, late, late_minutes)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id, work_date) DO NOTHING`,
    [user.id, lp.date, now, ip, late, late ? diff - grace : 0]
  );
  return { created: true, late, diff };
}

export async function todayDate() {
  const s = await getSettings();
  return localParts(new Date(), s.timezone).date;
}

export type DayRow = {
  work_date: string;
  sign_in: string | null;
  sign_out: string | null;
  ip: string | null;
  late: boolean;
  late_minutes: number;
  auto_out?: boolean;
  break_count: number;
  break_seconds: number;
  task_count: number;
  task_seconds: number;
};

export async function monthRows(userId: number, month: string): Promise<DayRow[]> {
  await autoCloseStale();
  return q<DayRow>(
    `SELECT a.work_date, a.sign_in, a.sign_out, a.ip, a.late, a.late_minutes, a.auto_out,
       (SELECT COUNT(*)::int FROM breaks b WHERE b.user_id=a.user_id AND b.work_date=a.work_date) AS break_count,
       (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(b.end_at, now()) - b.start_at))),0)::int FROM breaks b WHERE b.user_id=a.user_id AND b.work_date=a.work_date) AS break_seconds,
       (SELECT COUNT(*)::int FROM tasks t WHERE t.user_id=a.user_id AND t.work_date=a.work_date) AS task_count,
       (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(t.end_at, now()) - t.start_at))),0)::int FROM tasks t WHERE t.user_id=a.user_id AND t.work_date=a.work_date) AS task_seconds
     FROM attendance a WHERE a.user_id=$1 AND a.work_date LIKE $2 ORDER BY a.work_date DESC`,
    [userId, month + "-%"]
  );
}

export async function monthSummary(userId: number, month: string) {
  const s = await getSettings();
  const rows = await monthRows(userId, month);
  const lates = rows.filter((r) => r.late).length;
  return {
    rows,
    present: rows.length,
    lates,
    offs: Math.floor(lates / s.lates_per_off),
    breakSeconds: rows.reduce((a, r) => a + r.break_seconds, 0),
    breakCount: rows.reduce((a, r) => a + r.break_count, 0),
    taskSeconds: rows.reduce((a, r) => a + r.task_seconds, 0),
    settings: s,
  };
}

export function currentMonth(tz: string) {
  return localParts(new Date(), tz).month;
}

export function genPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function nextEmpId() {
  const r = await q1<{ n: string }>("SELECT nextval('emp_seq') AS n");
  return "EMP-" + String(r!.n).padStart(4, "0");
}

export async function adminToday(date: string) {
  await autoCloseStale();
  return q<any>(
    `SELECT u.id, u.emp_id, u.name, u.designation, u.department, u.shift_start, u.shift_end, u.shift_type, u.picture,
       a.sign_in, a.sign_out, a.ip, a.late, a.late_minutes,
       (SELECT COUNT(*)::int FROM breaks b WHERE b.user_id=u.id AND b.work_date=$1) AS break_count,
       (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(b.end_at, now()) - b.start_at))),0)::int FROM breaks b WHERE b.user_id=u.id AND b.work_date=$1) AS break_seconds,
       EXISTS (SELECT 1 FROM breaks b WHERE b.user_id=u.id AND b.end_at IS NULL) AS on_break,
       (SELECT t.title FROM tasks t WHERE t.user_id=u.id AND t.end_at IS NULL ORDER BY t.id DESC LIMIT 1) AS current_task
     FROM users u LEFT JOIN attendance a ON a.user_id=u.id AND a.work_date=$1
     WHERE u.role='user' AND u.active=TRUE ORDER BY u.department NULLS LAST, u.name`,
    [date]
  );
}

// ---------- Phase 2 ----------
export function expandDates(start: string, end: string, max = 60): string[] | null {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(start) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(end)) return null;
  const s = new Date(start + "T00:00:00Z"), e = new Date(end + "T00:00:00Z");
  if (isNaN(+s) || isNaN(+e) || e < s) return null;
  const out: string[] = [];
  for (let d = s; d <= e && out.length <= max; d = new Date(+d + 86400000)) out.push(d.toISOString().slice(0, 10));
  return out.length > max ? null : out;
}

export type Notif = {
  id: number; title: string; body: string; audience: string; kind: string; created_at: string; author_name: string;
  comments: { id: number; user_id: number; name: string; role: string; body: string; created_at: string }[];
};

// Admin sees everything. A user sees "all" plus their own department.
export async function getNotifications(user: { role: string; department: string | null }, limit = 30): Promise<Notif[]> {
  const where = user.role === "admin" ? "" : "WHERE n.audience='all' OR n.audience=$1";
  const params: any[] = user.role === "admin" ? [] : [user.department ?? "__none__"];
  const rows = await q<any>(
    `SELECT n.id, n.title, n.body, n.audience, n.kind, n.created_at, u.name AS author_name
     FROM notifications n JOIN users u ON u.id=n.author_id ${where} ORDER BY n.created_at DESC LIMIT ${limit}`, params);
  if (!rows.length) return [];
  const cs = await q<any>(
    `SELECT c.id, c.notification_id, c.user_id, c.body, c.created_at, u.name, u.role
     FROM notification_comments c JOIN users u ON u.id=c.user_id WHERE c.notification_id = ANY($1) ORDER BY c.created_at`,
    [rows.map((r: any) => r.id)]);
  return rows.map((r: any) => ({ ...r, comments: cs.filter((c: any) => c.notification_id === r.id) }));
}

export async function canSeeNotification(user: { role: string; department: string | null }, id: number) {
  const n = await q1<any>("SELECT audience FROM notifications WHERE id=$1", [id]);
  if (!n) return false;
  return user.role === "admin" || n.audience === "all" || n.audience === user.department;
}

// ---------- Presence ----------
// A normal user is "active" (green) while signed IN today and not yet OUT.
// The admin has no attendance, so the admin is active if seen in the last 5 minutes.
// Expects the users table aliased as u and a date parameter placeholder such as "$1".
export const onlineExpr = (dateParam: string) =>
  `(CASE WHEN u.role='admin' THEN COALESCE(u.last_seen > now() - interval '5 minutes', FALSE)
    ELSE EXISTS (SELECT 1 FROM attendance a WHERE a.user_id=u.id AND a.work_date=${dateParam} AND a.sign_out IS NULL) END)`;

export async function onlineIds(): Promise<Set<number>> {
  const d = await todayDate();
  const rows = await q<{ id: number }>(`SELECT u.id FROM users u WHERE u.active=TRUE AND ${onlineExpr("$1")}`, [d]);
  return new Set(rows.map((r) => r.id));
}
