// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { todayDate } from "@/lib/hr";
import { logActivity } from "@/lib/activity";

const T = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "user") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  const date = String(b.work_date || ""), reason = String(b.reason || "").trim();
  const rin = b.req_in ? String(b.req_in) : null, rout = b.req_out ? String(b.req_out) : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Choose a date" }, { status: 400 });
  if (date > (await todayDate())) return NextResponse.json({ error: "You cannot correct a future date" }, { status: 400 });
  if (!rin && !rout) return NextResponse.json({ error: "Enter the IN time, the OUT time, or both" }, { status: 400 });
  if ((rin && !T.test(rin)) || (rout && !T.test(rout))) return NextResponse.json({ error: "Invalid time" }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "Please enter a reason" }, { status: 400 });
  const dup = await q1("SELECT id FROM attendance_corrections WHERE user_id=$1 AND work_date=$2 AND status='pending'", [me.id, date]);
  if (dup) return NextResponse.json({ error: "A request for this date is already pending" }, { status: 409 });
  await q("INSERT INTO attendance_corrections (user_id, work_date, req_in, req_out, reason) VALUES ($1,$2,$3,$4,$5)", [me.id, date, rin, rout, reason.slice(0, 500)]);
  await logActivity(me.id, "attendance", "Requested attendance correction", `${date} ${rin ? "IN " + rin : ""} ${rout ? "OUT " + rout : ""}`.trim());
  return NextResponse.json({ ok: true });
}
