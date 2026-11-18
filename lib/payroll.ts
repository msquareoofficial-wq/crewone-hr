// Powered By Vistech Force
import { q, q1, getSettings } from "./db";
import { expandDates, todayDate } from "./hr";

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function payrollSettings() {
  const rows = await q<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key IN ('weekly_off','leaves_paid')");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { weekly_off: Number(m.weekly_off ?? 0), leaves_paid: (m.leaves_paid ?? "1") === "1" };
}

// Automatic calculation for one user and month (YYYY-MM).
export async function calcPayroll(userId: number, month: string) {
  const u = await q1<{ monthly_salary: string; shift_type: string }>("SELECT monthly_salary, shift_type FROM users WHERE id=$1", [userId]);
  const base = Number(u?.monthly_salary ?? 0);
  const s = await getSettings();
  const ps = await payrollSettings();
  const today = await todayDate();
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const hols = new Set((await q<{ holiday_date: string }>("SELECT holiday_date FROM holidays WHERE holiday_date LIKE $1", [month + "-%"])).map((h) => h.holiday_date));
  const working: string[] = [];
  for (let d = 1; d <= days; d++) {
    const ds = `${month}-${String(d).padStart(2, "0")}`;
    if (new Date(ds + "T00:00:00Z").getUTCDay() !== ps.weekly_off && !hols.has(ds)) working.push(ds);
  }
  const att = await q<{ work_date: string; late: boolean }>("SELECT work_date, late FROM attendance WHERE user_id=$1 AND work_date LIKE $2", [userId, month + "-%"]);
  const present = new Set(att.map((a) => a.work_date));
  const hybrid = u?.shift_type === "hybrid";
  const lates = hybrid ? 0 : att.filter((a) => a.late).length;
  const leaves = await q<{ start_date: string; end_date: string }>("SELECT start_date, end_date FROM leave_requests WHERE user_id=$1 AND status='approved' AND start_date<=$3 AND end_date>=$2", [userId, month + "-01", month + `-${days}`]);
  const leaveSet = new Set<string>();
  for (const l of leaves) for (const d of expandDates(l.start_date, l.end_date) ?? []) if (d.startsWith(month)) leaveSet.add(d);
  const leaveDays = working.filter((d) => leaveSet.has(d) && !present.has(d)).length;
  const absent = hybrid ? 0 : working.filter((d) => d <= today && !present.has(d) && !leaveSet.has(d)).length;
  const perDay = working.length ? base / working.length : 0;
  const absentDed = r2(absent * perDay + (ps.leaves_paid ? 0 : leaveDays * perDay));
  const lateDed = r2(Math.floor(lates / s.lates_per_off) * perDay);
  const presentWorking = present.size;
  return { base_salary: base, working_days: working.length, present_days: presentWorking, leave_days: leaveDays, absent_days: absent, late_count: lates, absent_deduction: absentDed, late_deduction: lateDed };
}

export const netOf = (b: { base_salary: number; absent_deduction: number; late_deduction: number; bonus: number; other_deduction: number }) =>
  Math.max(0, r2(b.base_salary - b.absent_deduction - b.late_deduction + b.bonus - b.other_deduction));

export async function savePayroll(userId: number, month: string, keep?: { bonus?: number; other_deduction?: number; note?: string | null; status?: string }) {
  const c = await calcPayroll(userId, month);
  const bonus = keep?.bonus ?? 0, other = keep?.other_deduction ?? 0;
  const net = netOf({ ...c, bonus, other_deduction: other });
  await q(
    `INSERT INTO payroll (user_id, month, base_salary, working_days, present_days, leave_days, absent_days, late_count, absent_deduction, late_deduction, bonus, other_deduction, net_salary, manual, note, status, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,FALSE,$14,$15,now())
     ON CONFLICT (user_id, month) DO UPDATE SET base_salary=EXCLUDED.base_salary, working_days=EXCLUDED.working_days, present_days=EXCLUDED.present_days,
       leave_days=EXCLUDED.leave_days, absent_days=EXCLUDED.absent_days, late_count=EXCLUDED.late_count, absent_deduction=EXCLUDED.absent_deduction,
       late_deduction=EXCLUDED.late_deduction, bonus=EXCLUDED.bonus, other_deduction=EXCLUDED.other_deduction, net_salary=EXCLUDED.net_salary, manual=FALSE, updated_at=now()`,
    [userId, month, c.base_salary, c.working_days, c.present_days, c.leave_days, c.absent_days, c.late_count, c.absent_deduction, c.late_deduction, bonus, other, net, keep?.note ?? null, keep?.status ?? "draft"]);
}
