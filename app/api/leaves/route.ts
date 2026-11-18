// Powered By Vistech Force
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { expandDates, todayDate } from "@/lib/hr";

export async function POST(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "user") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  const start = String(b.start_date || ""), end = String(b.end_date || b.start_date || ""), reason = String(b.reason || "").trim();
  const days = expandDates(start, end, 31);
  if (!days) return NextResponse.json({ error: "Invalid dates (max 31 days)" }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "Please enter a reason" }, { status: 400 });
  if (start < (await todayDate())) return NextResponse.json({ error: "You cannot apply for leave on a past date" }, { status: 400 });
  const overlap = await q1("SELECT id FROM leave_requests WHERE user_id=$1 AND status<>'rejected' AND start_date<=$3 AND end_date>=$2", [me.id, start, end]);
  if (overlap) return NextResponse.json({ error: "A leave request already exists for these dates" }, { status: 409 });
  await q("INSERT INTO leave_requests (user_id, start_date, end_date, reason) VALUES ($1,$2,$3,$4)", [me.id, start, end, reason.slice(0, 1000)]);
  await logActivity(me.id, "leave", "Applied for leave", `${start}${end !== start ? " to " + end : ""}: ${reason.slice(0, 120)}`);
  return NextResponse.json({ ok: true });
}
