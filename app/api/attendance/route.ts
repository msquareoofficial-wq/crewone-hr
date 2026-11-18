// Powered By Vistech Force
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession, getIp } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { markAttendance, todayDate } from "@/lib/hr";
import { autoCloseStale, pendingMissedOut } from "@/lib/missedout";

const T = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

// Attendance is marked ONLY by these buttons: IN marks sign in, OUT marks sign out.
// Closing the browser or logging out never marks OUT.
export async function POST(req: Request) {
  const u = await getSession();
  if (!u || u.role !== "user") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { action } = body;
  const d = await todayDate();
  await autoCloseStale(u.id);
  const att = await q1<{ id: number; sign_out: string | null }>("SELECT id, sign_out FROM attendance WHERE user_id=$1 AND work_date=$2", [u.id, d]);
  if (action === "in") {
    if (att) return NextResponse.json({ error: "You have already marked IN today" }, { status: 400 });
    const miss = await pendingMissedOut(u.id, d);
    if (miss) return NextResponse.json({ error: `You did not mark OUT on ${miss.work_date}. Please confirm your OUT time first.`, code: "missed_out" }, { status: 400 });
    const r = await markAttendance(u, getIp(req));
    if (r.created) await logActivity(u.id, "attendance", "Marked IN", r.late ? `Late by ${r.diff} min` : "On time", getIp(req));
    return NextResponse.json({ ok: true, ...r });
  }
  if (action === "out") {
    if (!att) return NextResponse.json({ error: "Mark IN first" }, { status: 400 });
    if (att.sign_out) return NextResponse.json({ error: "You have already marked OUT today" }, { status: 400 });
    const now = new Date();
    await q("UPDATE breaks SET end_at=$3 WHERE user_id=$1 AND work_date=$2 AND end_at IS NULL", [u.id, d, now]);
    await q("UPDATE tasks SET end_at=$3 WHERE user_id=$1 AND work_date=$2 AND end_at IS NULL", [u.id, d, now]);
    await q("UPDATE attendance SET sign_out=$3 WHERE id=$1 AND user_id=$2", [att.id, u.id, now]);
    await logActivity(u.id, "attendance", "Marked OUT", null, getIp(req));
    return NextResponse.json({ ok: true });
  }
  if (action === "confirm_out") {
    // the user did not mark OUT on an earlier day: keep the automatic OUT (shift end) or send the real time to the admin
    await autoCloseStale(u.id, true);
    const work_date = String(body.work_date || ""), time = body.time ? String(body.time) : null;
    const row = await q1<{ id: number; sign_out: string }>("SELECT id, sign_out FROM attendance WHERE user_id=$1 AND work_date=$2 AND auto_out AND NOT out_confirmed", [u.id, work_date]);
    if (!row) return NextResponse.json({ error: "Nothing to confirm for that day" }, { status: 400 });
    if (time) {
      if (!T.test(time)) return NextResponse.json({ error: "Invalid time" }, { status: 400 });
      const dup = await q1("SELECT id FROM attendance_corrections WHERE user_id=$1 AND work_date=$2 AND status='pending'", [u.id, work_date]);
      if (!dup) await q("INSERT INTO attendance_corrections (user_id, work_date, req_out, reason) VALUES ($1,$2,$3,$4)", [u.id, work_date, time, "Forgot to mark OUT (the system set OUT to the end of the shift)"]);
      await logActivity(u.id, "attendance", "Sent real OUT time", `${work_date} OUT ${time}`, getIp(req));
    } else {
      await logActivity(u.id, "attendance", "Confirmed automatic OUT", work_date, getIp(req));
    }
    await q("UPDATE attendance SET out_confirmed=TRUE WHERE id=$1", [row.id]);
    return NextResponse.json({ ok: true });
  }
  if (action === "undo_out") {
    // a user can undo a mistaken OUT within 10 minutes; after that only an admin can re-open the day
    if (!att || !att.sign_out) return NextResponse.json({ error: "You are not marked OUT" }, { status: 400 });
    if (Date.now() - new Date(att.sign_out).getTime() > 10 * 60 * 1000) return NextResponse.json({ error: "The 10 minute undo time is over. Please ask the admin to re-open your day." }, { status: 400 });
    await q("UPDATE attendance SET sign_out=NULL WHERE id=$1 AND user_id=$2", [att.id, u.id]);
    await logActivity(u.id, "attendance", "Undid OUT", "Re-opened own day within 10 minutes", getIp(req));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
