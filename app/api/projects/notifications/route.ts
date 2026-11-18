// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const c = await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM task_notifs WHERE user_id=$1 AND NOT read", [me.id]);
  const items = await q<any>(
    `SELECT n.id, n.task_id, n.project_id, n.kind, n.text, n.created_at, p.name AS project
     FROM task_notifs n JOIN projects p ON p.id=n.project_id WHERE n.user_id=$1 AND NOT n.read ORDER BY n.id DESC LIMIT 15`, [me.id]);
  return NextResponse.json({ count: c?.n ?? 0, items });
}

export async function POST() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await q("UPDATE task_notifs SET read=TRUE WHERE user_id=$1 AND NOT read", [me.id]);
  return NextResponse.json({ ok: true });
}
