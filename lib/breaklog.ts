// Powered By Vistech Force
import { q } from "./db";

export type BreakLogRow = { work_date: string; category: string | null; start_at: string; end_at: string | null; secs: number };

// Every break a user took in a month (YYYY-MM), newest day first.
export async function getBreakLog(userId: number, month: string): Promise<BreakLogRow[]> {
  return q<BreakLogRow>(
    "SELECT work_date, category, start_at, end_at, EXTRACT(EPOCH FROM (COALESCE(end_at, now()) - start_at))::int AS secs FROM breaks WHERE user_id=$1 AND work_date LIKE $2 ORDER BY work_date DESC, start_at ASC",
    [userId, month + "-%"]
  );
}

// Per user and category totals for a month (optionally one department).
export async function getBreakStats(month: string, dept: string) {
  return q<{ user_id: number; category: string | null; n: number; secs: number }>(
    "SELECT b.user_id, b.category, COUNT(*)::int AS n, COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(b.end_at, now()) - b.start_at))),0)::int AS secs FROM breaks b JOIN users u ON u.id=b.user_id WHERE b.work_date LIKE $1 " + (dept ? "AND u.department=$2 " : "") + "GROUP BY b.user_id, b.category",
    dept ? [month + "-%", dept] : [month + "-%"]
  );
}
