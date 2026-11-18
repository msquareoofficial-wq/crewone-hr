// Powered By Vistech Force
import { q } from "./db";

export type TaskLogRow = { work_date: string; title: string; start_at: string; end_at: string | null; secs: number };

// Every task a user started in a month (YYYY-MM), newest day first.
export async function getTaskLog(userId: number, month: string): Promise<TaskLogRow[]> {
  return q<TaskLogRow>(
    "SELECT work_date, title, start_at, end_at, EXTRACT(EPOCH FROM (COALESCE(end_at, now()) - start_at))::int AS secs FROM tasks WHERE user_id=$1 AND work_date LIKE $2 ORDER BY work_date DESC, start_at ASC",
    [userId, month + "-%"]
  );
}
