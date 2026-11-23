// Powered By Vistech Force
import { requireUser, can } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import { currentMonth, todayDate } from "@/lib/hr";
import Shell from "@/components/Shell";
import BigCalendar, { type CalEvent } from "@/components/BigCalendar";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUser();
  const s = await getSettings();
  const sp = await searchParams;
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : currentMonth(s.timezone);
  const today = await todayDate();
  const seeAll = can(user, "leaves");
  const events: CalEvent[] = [];

  // Fetch a 3-month window (prev + current + next) so week-view transitions work
  const [y, m] = month.split("-").map(Number);
  const rangeStart = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  const rangeEnd = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  const rangeMonth = `${month.slice(0, 4)}-`; // partial match for holidays

  const hols = await q<any>(
    "SELECT holiday_date, title FROM holidays WHERE holiday_date >= $1 AND holiday_date <= $2",
    [rangeStart, rangeEnd]
  );
  for (const h of hols) events.push({ date: h.holiday_date, label: h.title, kind: "hol" });

  const leaves = await q<any>(
    `SELECT l.start_date, l.end_date, l.status, u.name FROM leave_requests l JOIN users u ON u.id=l.user_id
     WHERE l.status IN ('approved','pending') AND l.start_date <= $1 AND l.end_date >= $2
     ${seeAll ? "" : "AND l.user_id=$3"}`,
    seeAll ? [rangeEnd, rangeStart] : [rangeEnd, rangeStart, user.id]
  );
  for (const l of leaves) {
    const a = l.start_date > rangeStart ? l.start_date : rangeStart;
    const b = l.end_date < rangeEnd ? l.end_date : rangeEnd;
    for (let d = new Date(a + "T00:00:00Z"); d <= new Date(b + "T00:00:00Z"); d = new Date(+d + 86400000))
      events.push({ date: d.toISOString().slice(0, 10), label: seeAll ? l.name : "Leave", kind: l.status === "approved" ? "leave" : "leavep" });
  }

  const tasks = await q<any>(
    `SELECT t.due_date::text AS due, t.title FROM project_tasks t JOIN projects p ON p.id=t.project_id
     WHERE t.due_date IS NOT NULL AND t.status <> 'done' AND p.archived = FALSE
       AND t.due_date >= $1 AND t.due_date <= $2
       ${user.role === "admin" ? "" : "AND t.assignee_id=$3"}`,
    user.role === "admin" ? [rangeStart, rangeEnd] : [rangeStart, rangeEnd, user.id]
  );
  for (const t of tasks) events.push({ date: t.due, label: t.title, kind: "task" });

  if (user.role !== "admin") {
    const att = await q<any>(
      "SELECT work_date, late FROM attendance WHERE user_id=$1 AND work_date >= $2 AND work_date <= $3",
      [user.id, rangeStart, rangeEnd]
    );
    for (const a of att) events.push({ date: a.work_date, label: a.late ? "Late" : "Present", kind: a.late ? "late" : "pres" });
  }

  void rangeMonth; // keep var for future filtering

  return (
    <Shell user={user}>
      <h1>Calendar</h1>
      <div className="card"><BigCalendar month={month} today={today} events={events} /></div>
    </Shell>
  );
}
