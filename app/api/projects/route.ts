// Powered By Vistech Force
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { todayDate } from "@/lib/hr";

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = await todayDate();
  const projects = await q<any>(
    `SELECT p.id, p.name, p.description, p.archived,
       (SELECT COUNT(*)::int FROM project_tasks t WHERE t.project_id=p.id) AS total,
       (SELECT COUNT(*)::int FROM project_tasks t WHERE t.project_id=p.id AND t.status='done') AS done,
       (SELECT COUNT(*)::int FROM project_tasks t WHERE t.project_id=p.id AND t.status<>'done' AND t.due_date < $3::date) AS overdue,
       (SELECT COUNT(*)::int FROM project_tasks t WHERE t.project_id=p.id AND t.status<>'done' AND t.assignee_id=$2) AS mine,
       (SELECT COUNT(*)::int FROM project_members m WHERE m.project_id=p.id) AS members
     FROM projects p WHERE ($1::boolean OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id=p.id AND m.user_id=$2))
     ORDER BY p.archived, p.created_at DESC`, [me.role === "admin", me.id, d]);
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Only admin can create projects" }, { status: 403 });
  const b = await req.json();
  const name = String(b.name || "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Enter a project name" }, { status: 400 });
  const description = String(b.description || "").trim().slice(0, 2000) || null;
  const ids = Array.from(new Set((Array.isArray(b.memberIds) ? b.memberIds : []).map(Number).filter((n: number) => n > 0)));
  const p = await q1<{ id: number }>("INSERT INTO projects (name, description, created_by) VALUES ($1,$2,$3) RETURNING id", [name, description, me.id]);
  if (ids.length) await q("INSERT INTO project_members (project_id, user_id) SELECT $1, id FROM users WHERE active=TRUE AND id = ANY($2) ON CONFLICT DO NOTHING", [p!.id, ids]);
  await logActivity(me.id, "project", "Created project", name);
  return NextResponse.json({ id: p!.id });
}
