// Powered By Vistech Force — calendar reminder cron (runs daily at 9 AM via Vercel Cron)
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

// Find all instances of a recurring event that fall on today (UTC date)
function findTodayInstances(ev: DbEv, todayStart: Date, todayEnd: Date): Date[] {
  const until = ev.recurrence_until ? new Date(ev.recurrence_until + "T23:59:59Z") : todayEnd;
  let cur = new Date(ev.start_dt);
  const instances: Date[] = [];
  let safety = 0;
  while (cur <= until && cur <= todayEnd && safety++ < 1500) {
    if (cur >= todayStart && cur <= todayEnd) instances.push(new Date(cur));
    if (ev.recurrence === "daily") cur = addDays(cur, 1);
    else if (ev.recurrence === "weekly") cur = addDays(cur, 7);
    else if (ev.recurrence === "monthly") cur = addMonths(cur, 1);
    else break;
  }
  return instances;
}

function fmtTime(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC",
  });
}

export async function GET(req: Request) {
  // Validate Vercel cron secret
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // Window = today UTC (full day)
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const todayEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  const todayDate  = todayStart.toISOString().slice(0, 10);

  // 1. Non-recurring events happening today with remind_minutes > 0
  const nonRecurring = await q<DbEv & { instance_dt: string }>(
    `SELECT ce.id, ce.created_by, ce.title, ce.start_dt, ce.end_dt, ce.visibility,
            ce.remind_minutes, ce.recurrence, ce.recurrence_until,
            ce.start_dt AS instance_dt
     FROM calendar_events ce
     WHERE ce.remind_minutes > 0
       AND ce.recurrence = 'none'
       AND ce.start_dt::date = $1::date
       AND NOT EXISTS (
         SELECT 1 FROM calendar_reminders_sent crs
         WHERE crs.event_id = ce.id AND crs.instance_dt = ce.start_dt
       )`,
    [todayDate]
  );

  // 2. Recurring events with an instance today
  const recurring = await q<DbEv>(
    `SELECT id, created_by, title, start_dt, end_dt, visibility,
            remind_minutes, recurrence, recurrence_until
     FROM calendar_events
     WHERE remind_minutes > 0
       AND recurrence <> 'none'
       AND start_dt::date <= $1::date
       AND (recurrence_until IS NULL OR recurrence_until >= $1::date)`,
    [todayDate]
  );

  const recurringToSend: (DbEv & { instance_dt: string })[] = [];
  for (const ev of recurring) {
    const instances = findTodayInstances(ev, todayStart, todayEnd);
    for (const instanceDt of instances) {
      const alreadySent = await q(
        "SELECT event_id FROM calendar_reminders_sent WHERE event_id=$1 AND instance_dt=$2",
        [ev.id, instanceDt.toISOString()]
      );
      if (!alreadySent.length) {
        recurringToSend.push({ ...ev, instance_dt: instanceDt.toISOString() });
      }
    }
  }

  const toSend = [...nonRecurring, ...recurringToSend];

  let sent = 0;
  for (const ev of toSend) {
    let userIds: number[];
    if (ev.visibility === "team") {
      const rows = await q<{ id: number }>("SELECT id FROM users WHERE active=TRUE");
      userIds = rows.map((r) => r.id);
    } else {
      userIds = [ev.created_by];
    }

    const instanceDate = new Date(ev.instance_dt);
    await pushTo(
      userIds,
      `Today: ${ev.title}`,
      `Scheduled for ${fmtTime(instanceDate)}`,
      "/calendar"
    );

    await q(
      "INSERT INTO calendar_reminders_sent (event_id, instance_dt) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [ev.id, ev.instance_dt]
    );
    sent++;
  }

  // Cleanup sent records older than 7 days
  await q("DELETE FROM calendar_reminders_sent WHERE sent_at < NOW() - interval '7 days'");

  return NextResponse.json({ ok: true, sent, checked: toSend.length });
}
