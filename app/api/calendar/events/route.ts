// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";

type DbEvent = {
  id: number; created_by: number; title: string; description: string | null;
  start_dt: string; end_dt: string; color: string; all_day: boolean;
  visibility: string; recurrence: string; recurrence_until: string | null;
  remind_minutes: number;
};

// Advance a Date by N days
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r;
}
// Advance a Date by N months (same day-of-month)
function addMonths(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate(),
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
}

// Expand a recurring event into instances within [rangeStart, rangeEnd].
// Returns an array of plain objects (same shape as DbEvent, with recurrence_base_id added).
function expandRecurring(ev: DbEvent, rangeStart: Date, rangeEnd: Date) {
  const dur = new Date(ev.end_dt).getTime() - new Date(ev.start_dt).getTime();
  const until = ev.recurrence_until
    ? new Date(ev.recurrence_until + "T23:59:59Z")
    : rangeEnd;
  const effectiveEnd = until < rangeEnd ? until : rangeEnd;

  // Find the first instance on or after rangeStart
  let cur = new Date(ev.start_dt);
  if (ev.recurrence === "daily") {
    if (cur < rangeStart) {
      const diffMs = rangeStart.getTime() - cur.getTime();
      const diffDays = Math.ceil(diffMs / 86400000);
      cur = addDays(cur, diffDays);
    }
  } else if (ev.recurrence === "weekly") {
    while (cur < rangeStart) cur = addDays(cur, 7);
  } else if (ev.recurrence === "monthly") {
    while (cur < rangeStart) cur = addMonths(cur, 1);
  }

  const instances = [];
  let safety = 0;
  while (cur <= effectiveEnd && safety++ < 500) {
    const endCur = new Date(cur.getTime() + dur);
    instances.push({
      ...ev,
      start_dt: cur.toISOString(),
      end_dt: endCur.toISOString(),
      recurrence_base_id: ev.id,
    });
    if (ev.recurrence === "daily") cur = addDays(cur, 1);
    else if (ev.recurrence === "weekly") cur = addDays(cur, 7);
    else if (ev.recurrence === "monthly") cur = addMonths(cur, 1);
  }
  return instances;
}

export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end required" }, { status: 400 });

  // Fetch base events (recurring ones may start before the range)
  const rows = await q<DbEvent>(
    `SELECT id, created_by, title, description, start_dt, end_dt, color, all_day, visibility,
            recurrence, recurrence_until, remind_minutes
     FROM calendar_events
     WHERE (created_by = $1 OR visibility = 'team')
       AND (
         -- non-recurring: overlap with range
         (recurrence = 'none' AND start_dt < $3::date + interval '1 day' AND end_dt >= $2::date)
         OR
         -- recurring: started before range end, and either no until or until >= range start
         (recurrence <> 'none' AND start_dt < $3::date + interval '1 day'
           AND (recurrence_until IS NULL OR recurrence_until >= $2::date))
       )
     ORDER BY start_dt`,
    [me.id, start, end]
  );

  const rangeStart = new Date(start + "T00:00:00Z");
  const rangeEnd = new Date(end + "T23:59:59Z");

  const result: any[] = [];
  for (const ev of rows) {
    if (ev.recurrence === "none") {
      result.push(ev);
    } else {
      result.push(...expandRecurring(ev, rangeStart, rangeEnd));
    }
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!b.start_dt || !b.end_dt) return NextResponse.json({ error: "start_dt and end_dt required" }, { status: 400 });
  const rec = ["none", "daily", "weekly", "monthly"].includes(b.recurrence) ? b.recurrence : "none";
  const remindMin = Number(b.remind_minutes ?? 0);
  const row = await q1<{ id: number }>(
    `INSERT INTO calendar_events (created_by, title, description, start_dt, end_dt, color, all_day, visibility, recurrence, recurrence_until, remind_minutes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      me.id,
      b.title.trim(),
      b.description || null,
      b.start_dt,
      b.end_dt,
      b.color || "#4f46e5",
      b.all_day ?? false,
      b.visibility === "team" ? "team" : "personal",
      rec,
      rec !== "none" && b.recurrence_until ? b.recurrence_until : null,
      remindMin >= 0 ? remindMin : 0,
    ]
  );
  return NextResponse.json(row, { status: 201 });
}
