import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { projectFor, ensureBoards } from "@/lib/projects";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  const project = await projectFor(me, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await ensureBoards(id);
  const members = await q<any>(
    `SELECT u.id, u.name, u.role, (u.picture IS NOT NULL) AS has_picture FROM users u
     WHERE u.active=TRUE AND (u.role='admin' OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id=$1 AND m.user_id=u.id)) ORDER BY u.name`, [id]);
  const tasks = await q<any>(
    `SELECT t.id, t.board_id, t.title, t.status, t.priority, t.assignee_id, t.created_by, t.labels, t.recur, t.blocked_by, to_char(t.due_date,'YYYY-MM-DD') AS due_date,
       (SELECT COUNT(*)::int FROM task_comments c WHERE c.task_id=t.id) AS comments,
       (SELECT COUNT(*)::int FROM task_files f WHERE f.task_id=t.id) AS files,
       (SELECT COUNT(*)::int FROM task_checklist k WHERE k.task_id=t.id) AS ck_total,
       (SELECT COUNT(*)::int FROM task_checklist k WHERE k.task_id=t.id AND k.done) AS ck_done,
       (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(x.ended_at, now()) - x.started_at))),0)::int FROM task_time x WHERE x.task_id=t.id) AS spent,
       EXISTS (SELECT 1 FROM task_time x WHERE x.task_id=t.id AND x.user_id=$2 AND x.ended_at IS NULL) AS running,
       EXISTS (SELECT 1 FROM project_tasks d WHERE d.id = ANY(t.blocked_by) AND d.status<>'done') AS blocked
     FROM project_tasks t WHERE t.project_id=$1 ORDER BY t.id`, [id, me.id]);
  const boards = await q<any>("SELECT id, name FROM project_boards WHERE project_id=$1 ORDER BY position, id", [id]);
  const cols = await q<any>("SELECT c.board_id, c.key, c.name FROM board_cols c JOIN project_boards b ON b.id=c.board_id WHERE b.project_id=$1 ORDER BY c.position, c.id", [id]);
  for (const b of boards) b.cols = cols.filter((c: any) => c.board_id === b.id).map((c: any) => ({ key: c.key, name: c.name }));
  const memberIds = (await q<{ user_id: number }>("SELECT user_id FROM project_members WHERE project_id=$1", [id])).map((r) => r.user_id);
  const users = me.role === "admin" ? await q<any>("SELECT id, name, role FROM users WHERE active=TRUE ORDER BY name") : [];
  return NextResponse.json({ project: { id: project.id, name: project.name, description: project.description, archived: project.archived }, members, memberIds, tasks, users, boards });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Only admin can edit projects" }, { status: 403 });
  const id = Number((await ctx.params).id);
  const project = await projectFor(me, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json();
  const name = b.name !== undefined ? String(b.name).trim().slice(0, 120) : project.name;
  if (!name) return NextResponse.json({ error: "Enter a project name" }, { status: 400 });
  const description = b.description !== undefined ? String(b.description).trim().slice(0, 2000) || null : project.description;
  const archived = b.archived !== undefined ? !!b.archived : project.archived;
  await q("UPDATE projects SET name=$2, description=$3, archived=$4 WHERE id=$1", [id, name, description, archived]);
  if (Array.isArray(b.members)) {
    const ids = Array.from(new Set(b.members.map(Number).filter((n: number) => n > 0)));
    await q("DELETE FROM project_members WHERE project_id=$1 AND NOT (user_id = ANY($2))", [id, ids]);
    if (ids.length) await q("INSERT INTO project_members (project_id, user_id) SELECT $1, id FROM users WHERE active=TRUE AND id = ANY($2) ON CONFLICT DO NOTHING", [id, ids]);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Only admin can delete projects" }, { status: 403 });
  await q("DELETE FROM projects WHERE id=$1", [Number((await ctx.params).id)]);
  return NextResponse.json({ ok: true });
}
