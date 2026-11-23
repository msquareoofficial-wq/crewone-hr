// Powered By Vistech Force
import { q1 } from "./db";

// Approved leave days (inclusive) that fall inside the given year.
export async function leaveUsed(userId: number, year: string): Promise<number> {
  const r = await q1<{ n: number }>(
    `SELECT COALESCE(SUM(LEAST(end_date::date, $3::date) - GREATEST(start_date::date, $2::date) + 1),0)::int AS n
     FROM leave_requests WHERE user_id=$1 AND status='approved' AND start_date::date <= $3::date AND end_date::date >= $2::date`,
    [userId, `${year}-01-01`, `${year}-12-31`]
  );
  return r?.n ?? 0;
}

// Full balance: used, quota (per-user override or global), remaining.
export async function leaveBalance(userId: number, year: string, globalQuota: number, userQuota?: number | null) {
  const quota = userQuota ?? globalQuota;
  const used = await leaveUsed(userId, year);
  const left = Math.max(0, quota - used);
  return { used, quota, left };
}
