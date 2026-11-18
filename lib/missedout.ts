// Powered By Vistech Force
import { q, q1, getSettings } from "./db";
import { localParts } from "./time";

// A user who forgets to click OUT leaves an open attendance row. Instead of showing that person as IN
// forever (and letting task/break time keep running), the row is closed at the end of the shift
// once 6 hours have passed, and marked as an automatic OUT that still has to be confirmed.
// Every day at 9 AM (office time) all open attendance rows are closed automatically.
const AUTO_OUT_HOUR = 9;
let lastRun = 0;

function daysBack(date: string, n: number) {
  return new Date(+new Date(date + "T00:00:00Z") - n * 86400000).toISOString().slice(0, 10);
}

export async function autoCloseStale(userId?: number, force = false) {
  if (!userId && Date.now() - lastRun < 30000) return;
  if (!userId) lastRun = Date.now();
  const s = await getSettings();
  const lp = localParts(new Date(), s.timezone);
  const today = lp.date;
  const uid = userId ?? null;
  // the most recent 9 AM that has already passed
  const cutDate = lp.minutes >= AUTO_OUT_HOUR * 60 ? today : daysBack(today, 1);
  const cut = cutDate + " " + String(AUTO_OUT_HOUR).padStart(2, "0") + ":00:00";
  // OUT = end of the shift that started with this IN (never later than the 9 AM cut, never before the IN)
  await q(
    `WITH c AS (
       SELECT a.id, a.work_date, a.sign_in,
         (CASE WHEN (l.d + u.shift_end::time) <= l.t THEN (l.d + u.shift_end::time + interval '1 day') ELSE (l.d + u.shift_end::time) END) AT TIME ZONE $2::text AS est,
         ($5::text)::timestamp AT TIME ZONE $2::text AS cut
       FROM attendance a JOIN users u ON u.id=a.user_id
       CROSS JOIN LATERAL (SELECT (a.sign_in AT TIME ZONE $2::text) AS t, (a.sign_in AT TIME ZONE $2::text)::date AS d) l
       WHERE a.sign_out IS NULL AND ($3::int IS NULL OR a.user_id=$3::int))
     UPDATE attendance a SET sign_out=GREATEST(LEAST(c.est, CASE WHEN c.sign_in < c.cut THEN c.cut ELSE now() END), c.sign_in), auto_out=TRUE, out_confirmed=FALSE
     FROM c WHERE a.id=c.id AND (c.sign_in < c.cut OR ($4::boolean AND c.work_date < $1::text))`,
    [today, s.timezone, uid, force, cut]
  );
  // breaks and tasks left open on an automatically closed day end when the day ended
  await q(
    `UPDATE breaks b SET end_at=GREATEST(a.sign_out, b.start_at) FROM attendance a
     WHERE b.user_id=a.user_id AND b.work_date=a.work_date AND b.end_at IS NULL AND a.auto_out AND a.sign_out IS NOT NULL
       AND ($1::int IS NULL OR b.user_id=$1::int)`, [uid]);
  await q(
    `UPDATE tasks t SET end_at=GREATEST(a.sign_out, t.start_at) FROM attendance a
     WHERE t.user_id=a.user_id AND t.work_date=a.work_date AND t.end_at IS NULL AND a.auto_out AND a.sign_out IS NOT NULL
       AND ($1::int IS NULL OR t.user_id=$1::int)`, [uid]);
}

// The most recent day (last 7 days) where the user did not mark OUT and has not confirmed it yet.
export async function pendingMissedOut(userId: number, today: string) {
  return q1<{ id: number; work_date: string; sign_in: string; sign_out: string | null; auto_out: boolean; shift_end: string }>(
    `SELECT a.id, a.work_date, a.sign_in, a.sign_out, a.auto_out, u.shift_end
     FROM attendance a JOIN users u ON u.id=a.user_id
     WHERE a.user_id=$1 AND a.work_date <= $2 AND a.work_date >= $3
       AND ((a.sign_out IS NULL AND a.work_date < $2) OR (a.auto_out AND NOT a.out_confirmed))
     ORDER BY a.work_date DESC LIMIT 1`,
    [userId, today, daysBack(today, 7)]
  );
}

// For the admin dashboard: everyone with an unconfirmed automatic OUT (or an OUT still open) in the last 14 days.
export async function adminMissedOut(today: string) {
  return q<any>(
    `SELECT a.id, a.user_id, a.work_date, a.sign_in, a.sign_out, a.auto_out, u.name, u.emp_id, u.shift_end
     FROM attendance a JOIN users u ON u.id=a.user_id
     WHERE u.active=TRUE AND a.work_date <= $1 AND a.work_date >= $2
       AND ((a.sign_out IS NULL AND a.work_date < $1) OR (a.auto_out AND NOT a.out_confirmed))
     ORDER BY a.work_date DESC, u.name`,
    [today, daysBack(today, 14)]
  );
}
