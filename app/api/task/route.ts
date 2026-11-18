// Powered By Vistech Force
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { todayDate } from "@/lib/hr";

export async function POST(req: Request) {
  const u = await getSession();
  if (!u || u.role !== "user") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, title } = await req.json();
  const d = await todayDate();
  const now = new Date();
  const att = await q1<{ id: number; sign_out: string | null }>("SELECT id, sign_out FROM attendance WHERE user_id=$1 AND work_date=$2", [u.id, d]);
  if (!att) return NextResponse.json({ error: "Mark IN first" }, { status: 400 });
  if (att.sign_out) return NextResponse.json({ error: "You are already OUT for today" }, { status: 400 });
  const openTask = await q1<{ id: number }>("SELECT id FROM tasks WHERE user_id=$1 AND end_at IS NULL ORDER BY id DESC LIMIT 1", [u.id]);
  if (action === "start") {
    const onBreak = await q1("SELECT id FROM breaks WHERE user_id=$1 AND end_at IS NULL", [u.id]);
    if (onBreak) return NextResponse.json({ error: "End your break first" }, { status: 400 });
    if (openTask) return NextResponse.json({ error: "End the current task first" }, { status: 400 });
    const t = String(title || "").trim();
    if (!t) return NextResponse.json({ error: "Enter a task name" }, { status: 400 });
    await q("INSERT INTO tasks (user_id, work_date, title, start_at) VALUES ($1,$2,$3,$4)", [u.id, d, t.slice(0, 200), now]);
    await logActivity(u.id, "task", "Started task", t.slice(0, 200));
  } else if (action === "end") {
    if (!openTask) return NextResponse.json({ error: "No task is running" }, { status: 400 });
    await q("UPDATE tasks SET end_at=$2 WHERE id=$1", [openTask.id, now]);
    await logActivity(u.id, "task", "Ended task");
  } else return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
