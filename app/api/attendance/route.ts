// Powered By Vistech Force
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession, getIp } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { markAttendance, todayDate } from "@/lib/hr";
import { autoCloseStale, pendingMissedOut } from "@/lib/missedout";

const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

type AttRow = { id: number; sign_out: string | null; work_date: string };

async function logPunch(userId: number, workDate: string, type: "in" | "out") {
  await q(
    "INSERT INTO attendance_punches (user_id, work_date, punch_type) VALUES ($1,$2,$3)",
    [userId, workDate, type]
  );
}

// IN/OUT buttons are the only way to mark attendance.
// Closing the browser or logging out never marks OUT.
export async function POST(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "user") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, work_date, time, reason } = body;
  const [today] = await Promise.all([todayDate(), autoCloseStale(me.id)]);
  const ip = getIp(req);

  const todayAtt = await q1<AttRow>(
    "SELECT id, sign_out, work_date FROM attendance WHERE user_id=$1 AND work_date=$2",
    [me.id, today]
  );

  // Open record from a previous day = night shift still active
  const nightAtt = !todayAtt
    ? await q1<AttRow>(
        "SELECT id, sign_out, work_date FROM attendance WHERE user_id=$1 AND sign_out IS NULL AND auto_out=FALSE AND work_date < $2 ORDER BY work_date DESC LIMIT 1",
        [me.id, today]
      )
    : null;

  // ── IN ──
  if (action === "in") {
    if (nightAtt)
      return NextResponse.json(
        { error: `You are still marked IN from ${nightAtt.work_date}. Please click OUT first.`, code: "night_shift_open" },
        { status: 400 }
      );

    if (todayAtt && !todayAtt.sign_out)
      return NextResponse.json({ error: "You are already marked IN" }, { status: 400 });

    // Re-entry after OUT on the same day
    if (todayAtt?.sign_out) {
      await q("UPDATE attendance SET sign_out=NULL WHERE id=$1 AND user_id=$2", [todayAtt.id, me.id]);
      await logPunch(me.id, today, "in");
      await logActivity(me.id, "attendance", "Marked IN again", "Re-entered after OUT", ip);
      return NextResponse.json({ ok: true, late: false });
    }

    const missed = await pendingMissedOut(me.id, today);
    if (missed)
      return NextResponse.json(
        { error: `You did not mark OUT on ${missed.work_date}. Please confirm your OUT time first.`, code: "missed_out" },
        { status: 400 }
      );

    const result = await markAttendance(me, ip);
    if (result.created) {
      await logPunch(me.id, today, "in");
      await logActivity(me.id, "attendance", "Marked IN", result.late ? `Late by ${result.diff} min` : "On time", ip);
    }
    return NextResponse.json({ ok: true, ...result });
  }

  // ── OUT ──
  if (action === "out") {
    const active = todayAtt || nightAtt;
    if (!active) return NextResponse.json({ error: "Mark IN first" }, { status: 400 });
    if (active.sign_out) return NextResponse.json({ error: "You have already marked OUT" }, { status: 400 });

    const now = new Date();
    const wd = active.work_date;
    await Promise.all([
      q("UPDATE breaks    SET end_at=$3 WHERE user_id=$1 AND work_date=$2 AND end_at IS NULL", [me.id, wd, now]),
      q("UPDATE tasks     SET end_at=$3 WHERE user_id=$1 AND work_date=$2 AND end_at IS NULL", [me.id, wd, now]),
      q("UPDATE attendance SET sign_out=$3 WHERE id=$1 AND user_id=$2", [active.id, me.id, now]),
    ]);
    await logPunch(me.id, wd, "out");
    await logActivity(me.id, "attendance", "Marked OUT", wd !== today ? `Night shift from ${wd}` : null, ip);
    return NextResponse.json({ ok: true });
  }

  // ── CONFIRM OUT (missed-out prompt) ──
  if (action === "confirm_out") {
    await autoCloseStale(me.id, true);
    const wd = String(work_date || "");
    const row = await q1<{ id: number; sign_out: string }>(
      "SELECT id, sign_out FROM attendance WHERE user_id=$1 AND work_date=$2 AND auto_out AND NOT out_confirmed",
      [me.id, wd]
    );
    if (!row) return NextResponse.json({ error: "Nothing to confirm for that day" }, { status: 400 });

    if (time) {
      if (!HHMM.test(String(time))) return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
      const existing = await q1(
        "SELECT id FROM attendance_corrections WHERE user_id=$1 AND work_date=$2 AND status='pending'",
        [me.id, wd]
      );
      if (!existing)
        await q(
          "INSERT INTO attendance_corrections (user_id, work_date, req_out, reason) VALUES ($1,$2,$3,$4)",
          [me.id, wd, time, "Forgot to mark OUT (system set OUT to shift end)"]
        );
      await logActivity(me.id, "attendance", "Sent real OUT time", `${wd} OUT ${time}`, ip);
    } else {
      await logActivity(me.id, "attendance", "Confirmed automatic OUT", wd, ip);
    }

    await q("UPDATE attendance SET out_confirmed=TRUE WHERE id=$1", [row.id]);
    return NextResponse.json({ ok: true });
  }

  // ── LATE REASON ──
  if (action === "late_reason") {
    await q(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_reason TEXT`);
    const r = String(reason || "").trim().slice(0, 300);
    if (!r) return NextResponse.json({ error: "Reason required" }, { status: 400 });
    if (!todayAtt) return NextResponse.json({ error: "No attendance record found for today" }, { status: 400 });
    await q("UPDATE attendance SET late_reason=$2 WHERE id=$1", [todayAtt.id, r]);
    await logActivity(me.id, "attendance", "Provided late reason", r, ip);
    return NextResponse.json({ ok: true });
  }

  // ── UNDO OUT (10-minute window) ──
  if (action === "undo_out") {
    if (!todayAtt?.sign_out) return NextResponse.json({ error: "You are not marked OUT" }, { status: 400 });
    const elapsed = Date.now() - new Date(todayAtt.sign_out).getTime();
    if (elapsed > 10 * 60 * 1000)
      return NextResponse.json(
        { error: "The 10-minute undo window has passed. Use the IN button to mark IN again." },
        { status: 400 }
      );
    await q("UPDATE attendance SET sign_out=NULL WHERE id=$1 AND user_id=$2", [todayAtt.id, me.id]);
    await logActivity(me.id, "attendance", "Undid OUT", "Re-opened within 10-minute window", ip);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
