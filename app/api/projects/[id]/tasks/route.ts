import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { projectFor, validAssignee, cleanDate, cleanLabels, cleanRecur, cleanDeps, logAct, notify, PRIORITIES, ensureBoards, boardIn, colKeys } from "@/lib/projects";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  const project = await projectFor(me, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.archived) return NextResponse.json({ error: "This project is archived" }, { status: 400 });
  const b = await req.json();
  const title = String(b.title || "").trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: "Enter a task title" }, { status: 400 });
  const firstBoard = await ensureBoards(id);
  const board = (await boardIn(id, Number(b.board_id))) ?? { id: firstBoard };
  const status = (await colKeys(board.id)).includes(b.status) ? b.status : "todo";
  const priority = (PRIORITIES as readonly string[]).includes(b.priority) ? b.priority : "medium";
  const assignee = Number(b.assignee_id) || null;
  if (!(await validAssignee(id, assignee))) return NextResponse.json({ error: "Assignee is not a member of this project" }, { status: 400 });
  const t = await q1<{ id: number }>(
    `INSERT INTO project_tasks (board_id, project_id, title, description, status, priority, assignee_id, due_date, created_by, labels, recur, blocked_by, completed_at)
     VALUES ($12,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, CASE WHEN $4='done' THEN now() END) RETURNING id`,
    [id, title, String(b.description || "").trim().slice(0, 5000) || null, status, priority, assignee, cleanDate(b.due_date), me.id, cleanLabels(b.labels), cleanRecur(b.recur), await cleanDeps(id, null, b.blocked_by), board.id]);
  await logAct(t!.id, me.id, "created this task");
  await logActivity(me.id, "project", "Created task", `${title} (${project.name ?? "project " + id})`);
  await notify([assignee], me.id, t!.id, id, "assigned", `${me.name} assigned you: ${title}`);
  return NextResponse.json({ id: t!.id });
}
