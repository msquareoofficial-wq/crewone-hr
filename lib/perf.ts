// Powered By Vistech Force
import { q } from "./db";
import { getSettings } from "./db";
import { todayDate } from "./hr";

export const BREAK_ALLOWANCE_MIN = 60; // per present day

export type Perf = {
  id: number; emp_id: string; name: string; designation: string | null; department: string | null; picture: string | null;
  present: number; expected: number; lates: number; breakAvgMin: number; taskTotal: number; taskDone: number; workHours: number;
  att: number | null; punct: number | null; task: number | null; brk: number | null; overall: number | null;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export async function monthPerformance(month: string, dept: string): Promise<Perf[]> {
  const like = month + "-%";
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const today = new Date((await todayDate()) + "T00:00:00Z");
  const end = today < last ? today : last;
  const hol = new Set((await q<any>("SELECT holiday_date FROM holidays WHERE holiday_date LIKE $1", [like])).map((h: any) => h.holiday_date));
  const days: string[] = [];
  for (let d = new Date(first); d <= end; d = new Date(+d + 86400000)) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6 && !hol.has(iso(d))) days.push(iso(d));
  }
  const users = await q<any>("SELECT id, emp_id, name, designation, department, picture, shift_type FROM users WHERE role='user' AND active=TRUE " + (dept ? "AND department=$1 " : "") + "ORDER BY name", dept ? [dept] : []);
  const att = new Map((await q<any>("SELECT user_id, COUNT(*)::int n, COUNT(*) FILTER (WHERE late)::int l FROM attendance WHERE work_date LIKE $1 GROUP BY user_id", [like])).map((r: any) => [r.user_id, r]));
  const brk = new Map((await q<any>("SELECT user_id, COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_at, start_at) - start_at))),0)::int s FROM breaks WHERE work_date LIKE $1 GROUP BY user_id", [like])).map((r: any) => [r.user_id, r.s]));
  const tm = new Map((await q<any>("SELECT user_id, COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_at, start_at) - start_at))),0)::int s FROM tasks WHERE work_date LIKE $1 GROUP BY user_id", [like])).map((r: any) => [r.user_id, r.s]));
  const pt = new Map((await q<any>(
    `SELECT t.assignee_id AS uid, COUNT(*)::int total, COUNT(*) FILTER (WHERE t.status='done')::int done
     FROM project_tasks t JOIN projects p ON p.id=t.project_id
     WHERE p.archived=FALSE AND t.assignee_id IS NOT NULL
       AND to_char(COALESCE(t.due_date::timestamp, t.created_at),'YYYY-MM')=$1 GROUP BY t.assignee_id`, [month])).map((r: any) => [r.uid, r]));
  const leaves = await q<any>("SELECT user_id, start_date, end_date FROM leave_requests WHERE status='approved' AND start_date <= $1 AND end_date >= $2", [iso(last), iso(first)]);
  const dset = new Set(days);
  const leaveDays = new Map<number, Set<string>>();
  for (const l of leaves) {
    const s = leaveDays.get(l.user_id) ?? new Set<string>();
    for (let d = new Date(l.start_date + "T00:00:00Z"); d <= new Date(l.end_date + "T00:00:00Z"); d = new Date(+d + 86400000)) if (dset.has(iso(d))) s.add(iso(d));
    leaveDays.set(l.user_id, s);
  }
  return users.map((u: any) => {
    const a = att.get(u.id); const present = a?.n ?? 0; const lates = a?.l ?? 0;
    const expected = u.shift_type === "hybrid" ? present : Math.max(0, days.length - (leaveDays.get(u.id)?.size ?? 0));
    const p = pt.get(u.id); const taskTotal = p?.total ?? 0; const taskDone = p?.done ?? 0;
    const breakAvgMin = present ? Math.round((brk.get(u.id) ?? 0) / 60 / present) : 0;
    const attS = expected ? clamp((present / expected) * 100) : present ? 100 : null;
    const punct = present ? clamp(((present - lates) / present) * 100) : null;
    const task = taskTotal ? clamp((taskDone / taskTotal) * 100) : null;
    const brkS = present ? clamp(100 - (Math.max(0, breakAvgMin - BREAK_ALLOWANCE_MIN) / BREAK_ALLOWANCE_MIN) * 100) : null;
    const parts: [number | null, number][] = [[attS, 40], [punct, 20], [task, 30], [brkS, 10]];
    const used = parts.filter((x) => x[0] !== null) as [number, number][];
    const w = used.reduce((s, x) => s + x[1], 0);
    const overall = w ? clamp(used.reduce((s, x) => s + x[0] * x[1], 0) / w) : null;
    return { id: u.id, emp_id: u.emp_id, name: u.name, designation: u.designation, department: u.department, picture: u.picture,
      present, expected, lates, breakAvgMin, taskTotal, taskDone, workHours: Math.round(((tm.get(u.id) ?? 0) / 3600) * 10) / 10,
      att: attS, punct, task, brk: brkS, overall };
  }).sort((a: Perf, b: Perf) => (b.overall ?? -1) - (a.overall ?? -1));
}
