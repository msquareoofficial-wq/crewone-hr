// Powered By Vistech Force
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { todayDate } from "@/lib/hr";
import { BREAK_CATS, catLabel } from "@/lib/breakcats";

export async function POST(req: Request) {
  const u = await getSession();
  if (!u || u.role !== "user") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, category } = await req.json();
  const cat = BREAK_CATS.some((c) => c.key === category) ? (category as string) : "other";
  const d = await todayDate();
  const now = new Date();
  const att = await q1<{ id: number; sign_out: string | null }>("SELECT id, sign_out FROM attendance WHERE user_id=$1 AND work_date=$2", [u.id, d]);
  if (!att) return NextResponse.json({ error: "Mark IN first" }, { status: 400 });
  if (att.sign_out) return NextResponse.json({ error: "You are already OUT for today" }, { status: 400 });
  const open = await q1<{ id: number }>("SELECT id FROM breaks WHERE user_id=$1 AND end_at IS NULL ORDER BY id DESC LIMIT 1", [u.id]);
  if (action === "start") {
    if (open) return NextResponse.json({ error: "A break is already running" }, { status: 400 });
    // a running task keeps running through the break (long tasks should not stop)
    await q("INSERT INTO breaks (user_id, work_date, start_at, category) VALUES ($1,$2,$3,$4)", [u.id, d, now, cat]);
    await logActivity(u.id, "break", `Started a break (${catLabel(cat)})`);
  } else if (action === "end") {
    if (!open) return NextResponse.json({ error: "No break is running" }, { status: 400 });
    await q("UPDATE breaks SET end_at=$2 WHERE id=$1", [open.id, now]);
    await logActivity(u.id, "break", "Ended a break");
  } else return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
