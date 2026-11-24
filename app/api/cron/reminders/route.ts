// Powered By Vistech Force — calendar reminder cron (runs every minute via Vercel Cron)
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { pushTo } from "@/lib/push";

type DbEv = {
  id: number; created_by: number; title: string;
  start_dt: string; end_dt: string; visibility: string;
  remind_minutes: number; recurrence: string; recurrence_until: string | null;
};

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r;
}
function addMonths(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate(),
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
}

// Find the next instance of a recurring event whose remind_at falls in [windowStart, windowEnd]
function findRecurringInstance(ev: DbEv, windowStart: Date, windowEnd: Date): Date | null {
  const remMs = ev.remind_minutes * 60_000;
  const until = ev.recurrence_until ? new Date(ev.recurrence_until + "T23:59:59Z") : new Date(Date.now() + 365 * 86400_000);
  let cur = new Date(ev.start_dt);
  let safety = 0;
  while (cur <= until && safety++ < 1500) {
    const remindAt = new Date(cur.getTime() - remMs);
    if (remindAt >= windowStart && remindAt <= windowEnd) return cur;
    if (remindAt > windowEnd) break;
    if (ev.recurrence === "daily") cur = addDays(cur, 1);
    else if (ev.recurrence === "weekly") cur = addDays(cur, 7);
    else if (ev.recurrence === "monthly") cur = addMonths(cur, 1);
    else break;
  }
  return null;
}

function reminderLabel(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes === 60) return "1 hour";
  if (minutes < 1440) return `${minutes / 60} hours`;
  return "1 day";
}

export async function GET(req: Request) {
  // Validate Vercel cron secret
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();
  // Window: remind_at must be between 90s ago and 30s from now
  const windowStart = new Date(now.getTime() - 90_000);
  const windowEnd = new Date(now.getTime() + 30_000);

  // 1. Non-recurring events whose reminder falls in the window and hasn't been sent yet
  const nonRecurring = await q<DbEv & { instance_dt: string }>(
    `SELECT ce.id, ce.created_by, ce.title, ce.start_dt, ce.end_dt, ce.visibility,
            ce.remind_minutes, ce.recurrence, ce.recurrence_until,
            ce.start_dt AS instance_dt
     FROM calendar_events ce
     WHERE ce.remind_minutes > 0
       AND ce.recurrence = 'none'
       AND (ce.start_dt - ce.remind_minutes * interval '1 minute') BETWEEN $1 AND $2
       AND NOT EXISTS (
         SELECT 1 FROM calendar_reminders_sent crs
         WHERE crs.event_id = ce.id AND crs.instance_dt = ce.start_dt
       )`,
    [windowStart.toISOString(), windowEnd.toISOString()]
  );

  // 2. Recurring events that could have an instance with reminder in the window
  const recurring = await q<DbEv>(
    `SELECT id, created_by, title, start_dt, end_dt, visibility,
            remind_minutes, recurrence, recurrence_until
     FROM calendar_events
     WHERE remind_minutes > 0
       AND recurrence <> 'none'
       AND start_dt <= $2
       AND (recurrence_until IS NULL OR recurrence_until >= $1::date)`,
    [windowStart.toISOString(), windowEnd.toISOString()]
  );

  // Find which recurring instances need reminders now
  const recurringToSend: (DbEv & { instance_dt: string })[] = [];
  for (const ev of recurring) {
    const instanceDt = findRecurringInstance(ev, windowStart, windowEnd);
    if (!instanceDt) continue;
    // Check not already sent
    const alreadySent = await q<{ event_id: number }>(
      "SELECT event_id FROM calendar_reminders_sent WHERE event_id=$1 AND instance_dt=$2",
      [ev.id, instanceDt.toISOString()]
    );
    if (!alreadySent.length) {
      recurringToSend.push({ ...ev, instance_dt: instanceDt.toISOString() });
    }
  }

  const toSend = [
    ...nonRecurring,
    ...recurringToSend,
  ];

  let sent = 0;
  for (const ev of toSend) {
    // Determine who to notify
    let userIds: number[];
    if (ev.visibility === "team") {
      const rows = await q<{ id: number }>("SELECT id FROM users WHERE active=TRUE");
      userIds = rows.map((r) => r.id);
    } else {
      userIds = [ev.created_by];
    }

    const instanceDate = new Date(ev.instance_dt);
    const timeStr = instanceDate.toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      timeZone: "UTC",
    });

    await pushTo(
      userIds,
      `Reminder: ${ev.title}`,
      `Starts in ${reminderLabel(ev.remind_minutes)} (${timeStr})`,
      "/calendar"
    );

    // Mark as sent
    await q(
      "INSERT INTO calendar_reminders_sent (event_id, instance_dt) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [ev.id, ev.instance_dt]
    );

    sent++;
  }

  // Cleanup old sent records
  await q("DELETE FROM calendar_reminders_sent WHERE sent_at < NOW() - interval '7 days'");

  return NextResponse.json({ ok: true, sent, checked: toSend.length });
}
