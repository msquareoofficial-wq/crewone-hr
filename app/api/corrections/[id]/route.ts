import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1, getSettings } from "@/lib/db";
import { minutesLate, hhmmToMinutes } from "@/lib/time";
import { logActivity } from "@/lib/activity";
import { pushTo } from "@/lib/push";

// Admin approves or rejects. Approving writes the corrected times into attendance.
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  const b = await req.json();
  if (!["approved", "rejected"].includes(b.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const c = await q1<any>("SELECT c.*, u.name, u.shift_start, u.shift_type FROM attendance_corrections c JOIN users u ON u.id=c.user_id WHERE c.id=$1", [id]);
  if (!c || c.status !== "pending") return NextResponse.json({ error: "Request not found or already decided" }, { status: 400 });
  if (b.status === "approved") {
    const s = await getSettings();
    const ex = await q1<any>("SELECT id FROM attendance WHERE user_id=$1 AND work_date=$2", [c.user_id, c.work_date]);
    if (!ex && !c.req_in) return NextResponse.json({ error: "No attendance exists for that day, so an IN time is required" }, { status: 400 });
    const ts = (t: string) => `(($1::text || ' ' || $2::text)::timestamp AT TIME ZONE $3)`;
    if (c.req_in) {
      const diff = minutesLate(hhmmToMinutes(c.req_in), c.shift_start);
      const late = c.shift_type !== "hybrid" && diff >= s.grace_minutes;
      if (ex) await q(`UPDATE attendance SET sign_in=${ts("")}, late=$4, late_minutes=$5 WHERE id=$6`, [c.work_date, c.req_in, s.timezone, late, late ? diff : 0, ex.id]);
      else await q(`INSERT INTO attendance (user_id, work_date, sign_in, ip, late, late_minutes) VALUES ($6, $1, ${ts("")}, 'correction', $4, $5)`, [c.work_date, c.req_in, s.timezone, late, late ? diff : 0, c.user_id]);
    }
    if (c.req_out) await q(`UPDATE attendance SET sign_out=${ts("")}, auto_out=FALSE, out_confirmed=TRUE WHERE user_id=$4 AND work_date=$1`, [c.work_date, c.req_out, s.timezone, c.user_id]);
  }
  await q("UPDATE attendance_corrections SET status=$2, admin_note=$3, decided_at=now() WHERE id=$1", [id, b.status, b.note ? String(b.note).slice(0, 300) : null]);
  await logActivity(me.id, "attendance", `Correction ${b.status}`, `${c.name}, ${c.work_date}`);
  await pushTo([c.user_id], `Correction ${b.status}`, `Your attendance correction for ${c.work_date} was ${b.status}`, "/dashboard");
  return NextResponse.json({ ok: true });
}
