import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { projectFor, validAssignee, cleanDate, cleanLabels, projectUserIds, cleanRecur, cleanDeps, createsCycle, openBlockers, logAct, notify, PRIORITIES, colKeys, colName } from "@/lib/projects";

async function load(me: SessionUser, idStr: string) {
  const id = Number(idStr);
  const t = id ? await q1<any>("SELECT *, to_char(due_date,'YYYY-MM-DD') AS due FROM project_tasks WHERE id=$1", [id]) : null;
  if (!t) return null;
  const p = await projectFor(me, t.project_id);
  return p ? { t, p } : null;
}

const SECS = "COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(x.ended_at, now()) - x.started_at))),0)::int";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const x = await load(me, (await ctx.params).id);
  if (!x) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { t } = x;
  await q("UPDATE task_notifs SET read=TRUE WHERE user_id=$1 AND task_id=$2 AND NOT read", [me.id, t.id]);
  const comments = await q<any>("SELECT c.id, c.body, c.created_at, c.user_id, c.mentions, u.name FROM task_comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.task_id=$1 ORDER BY c.id", [t.id]);
  const files = await q<any>("SELECT f.id, f.name, f.size, tf.user_id FROM task_files tf JOIN chat_files f ON f.id=tf.file_id WHERE tf.task_id=$1 ORDER BY f.id", [t.id]);
  const checklist = await q<any>("SELECT id, text, done FROM task_checklist WHERE task_id=$1 ORDER BY id", [t.id]);
  const total = await q1<{ n: number }>(`SELECT ${SECS} AS n FROM task_time x WHERE x.task_id=$1`, [t.id]);
  const byUser = await q<any>(`SELECT u.name, ${SECS} AS seconds FROM task_time x JOIN users u ON u.id=x.user_id WHERE x.task_id=$1 GROUP BY u.name ORDER BY seconds DESC`, [t.id]);
  const activity = await q<any>("SELECT a.id, a.text, a.created_at, u.name FROM task_activity a LEFT JOIN users u ON u.id=a.user_id WHERE a.task_id=$1 ORDER BY a.id DESC LIMIT 30", [t.id]);
  const deps = t.blocked_by?.length ? await q<any>("SELECT id, title, status FROM project_tasks WHERE id = ANY($1) ORDER BY id", [t.blocked_by]) : [];
  const running = !!(await q1("SELECT 1 FROM task_time WHERE task_id=$1 AND user_id=$2 AND ended_at IS NULL", [t.id, me.id]));
  return NextResponse.json({
    task: { id: t.id, project_id: t.project_id, title: t.title, description: t.description, status: t.status, priority: t.priority, assignee_id: t.assignee_id, created_by: t.created_by, due_date: t.due, labels: t.labels, recur: t.recur, blocked_by: t.blocked_by },
    comments, files, checklist, activity, deps, time: { total: total?.n ?? 0, byUser, running },
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const x = await load(me, (await ctx.params).id);
  if (!x) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json();
  const { t } = x;
  if (b.removeFile) {
    const fid = Number(b.removeFile);
    await q("DELETE FROM task_files WHERE task_id=$1 AND file_id=$2 AND ($3::boolean OR user_id=$4)", [t.id, fid, me.role === "admin", me.id]);
    return NextResponse.json({ ok: true });
  }
  const title = b.title !== undefined ? String(b.title).trim().slice(0, 200) : t.title;
  if (!title) return NextResponse.json({ error: "Enter a task title" }, { status: 400 });
  const status = b.status !== undefined ? b.status : t.status;
  const priority = b.priority !== undefined ? b.priority : t.priority;
  if (!(await colKeys(t.board_id)).includes(status) || !(PRIORITIES as readonly string[]).includes(priority)) return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  const assignee = b.assignee_id !== undefined ? Number(b.assignee_id) || null : t.assignee_id;
  if (assignee !== t.assignee_id && !(await validAssignee(t.project_id, assignee))) return NextResponse.json({ error: "Assignee is not a member of this project" }, { status: 400 });
  const description = b.description !== undefined ? String(b.description).trim().slice(0, 5000) || null : t.description;
  const due = b.due_date !== undefined ? cleanDate(b.due_date) : t.due;
  const labels = b.labels !== undefined ? cleanLabels(b.labels) : t.labels;
  const recur = b.recur !== undefined ? cleanRecur(b.recur) : t.recur;
  let deps: number[] = t.blocked_by || [];
  if (b.blocked_by !== undefined) {
    deps = await cleanDeps(t.project_id, t.id, b.blocked_by);
    if (await createsCycle(t.id, deps)) return NextResponse.json({ error: "These tasks would block each other in a loop" }, { status: 400 });
  }
  if (status !== t.status && status !== "todo") {
    const open = await openBlockers(deps);
    if (open.length) return NextResponse.json({ error: `Blocked by unfinished task: ${open.join(", ")}` }, { status: 400 });
  }
  await q(
    `UPDATE project_tasks SET title=$2, description=$3, status=$4, priority=$5, assignee_id=$6, due_date=$7, labels=$8, recur=$9, blocked_by=$10, updated_at=now(),
       completed_at = CASE WHEN $4='done' AND status<>'done' THEN now() WHEN $4<>'done' THEN NULL ELSE completed_at END WHERE id=$1`,
    [t.id, title, description, status, priority, assignee, due, labels, recur, deps]);
  if (status !== t.status) await logActivity(me.id, "project", "Moved task", `${title}: ${await colName(t.board_id, t.status)} to ${await colName(t.board_id, status)}`);
  if (status !== t.status) await logAct(t.id, me.id, `moved from ${await colName(t.board_id, t.status)} to ${await colName(t.board_id, status)}`);
  if (priority !== t.priority) await logAct(t.id, me.id, `changed priority from ${t.priority} to ${priority}`);
  if (title !== t.title) await logAct(t.id, me.id, `renamed the task to "${title}"`);
  if (due !== t.due) await logAct(t.id, me.id, due ? `set due date to ${due}` : "removed the due date");
  if (assignee !== t.assignee_id) {
    const u = assignee ? await q1<{ name: string }>("SELECT name FROM users WHERE id=$1", [assignee]) : null;
    await logAct(t.id, me.id, u ? `assigned the task to ${u.name}` : "unassigned the task");
  }
  if (recur !== t.recur) await logAct(t.id, me.id, recur ? `set the task to repeat ${recur}` : "stopped repeating the task");
  if (JSON.stringify([...deps].sort()) !== JSON.stringify([...(t.blocked_by || [])].sort())) await logAct(t.id, me.id, deps.length ? `now blocked by ${deps.length} task(s)` : "removed all blockers");
  if (assignee !== t.assignee_id) await notify([assignee], me.id, t.id, t.project_id, "assigned", `${me.name} assigned you: ${title}`);
  if (status === "done" && t.status !== "done" && recur) {
    const n = await q1<{ id: number }>(
      `INSERT INTO project_tasks (board_id, project_id, title, description, status, priority, assignee_id, due_date, created_by, labels, recur)
       SELECT board_id, project_id, title, description, 'todo', priority, assignee_id,
         (GREATEST(COALESCE(due_date, CURRENT_DATE), CURRENT_DATE) + CASE recur WHEN 'daily' THEN INTERVAL '1 day' WHEN 'weekly' THEN INTERVAL '7 days' ELSE INTERVAL '1 month' END)::date,
         created_by, labels, recur FROM project_tasks WHERE id=$1 RETURNING id`, [t.id]);
    if (n) {
      await q("INSERT INTO task_checklist (task_id, text) SELECT $2, text FROM task_checklist WHERE task_id=$1", [t.id, n.id]);
      await q("UPDATE project_tasks SET recur=NULL WHERE id=$1", [t.id]);
      await logAct(t.id, me.id, `completed it, next ${recur} copy created`);
      await logAct(n.id, me.id, `created automatically (repeats ${recur})`);
      await notify([assignee], me.id, n.id, t.project_id, "assigned", `Repeating task is back: ${title}`);
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const x = await load(me, (await ctx.params).id);
  if (!x) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (me.role !== "admin" && x.t.created_by !== me.id) return NextResponse.json({ error: "Only admin or the task creator can delete it" }, { status: 403 });
  await q("DELETE FROM project_tasks WHERE id=$1", [x.t.id]);
  await logActivity(me.id, "project", "Deleted task", x.t.title);
  return NextResponse.json({ ok: true });
}

// { comment, mentions } | { file: { id } } | { check: { add | toggle | remove } } | { timer: "start" | "stop" }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const x = await load(me, (await ctx.params).id);
  if (!x) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { t } = x;
  const b = await req.json();
  if (b.file) {
    const fid = Number(b.file.id);
    const row = fid ? await q1<{ size: number; got: number }>(
      "SELECT f.size, (SELECT COALESCE(SUM(LENGTH(data)),0)::int FROM chat_file_chunks WHERE file_id=f.id) AS got FROM chat_files f WHERE f.id=$1 AND f.uploader_id=$2", [fid, me.id]) : null;
    if (!row || row.got !== row.size) return NextResponse.json({ error: "File upload is incomplete, please try again" }, { status: 400 });
    await q("INSERT INTO task_files (task_id, file_id, user_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [t.id, fid, me.id]);
    await logAct(t.id, me.id, "attached a file");
    return NextResponse.json({ ok: true });
  }
  if (b.check) {
    const c = b.check;
    if (c.add !== undefined) {
      const text = String(c.add).trim().slice(0, 200);
      if (!text) return NextResponse.json({ error: "Enter a checklist item" }, { status: 400 });
      await q("INSERT INTO task_checklist (task_id, text) VALUES ($1,$2)", [t.id, text]);
    } else if (c.toggle) await q("UPDATE task_checklist SET done = NOT done WHERE id=$1 AND task_id=$2", [Number(c.toggle), t.id]);
    else if (c.remove) await q("DELETE FROM task_checklist WHERE id=$1 AND task_id=$2", [Number(c.remove), t.id]);
    return NextResponse.json({ ok: true });
  }
  if (b.timer) {
    await q("UPDATE task_time SET ended_at=now() WHERE user_id=$1 AND ended_at IS NULL", [me.id]);
    if (b.timer === "start") await q("INSERT INTO task_time (task_id, user_id) VALUES ($1,$2)", [t.id, me.id]);
    return NextResponse.json({ ok: true });
  }
  const body = String(b.comment || "").trim().slice(0, 3000);
  if (!body) return NextResponse.json({ error: "Comment is empty" }, { status: 400 });
  const wanted = Array.isArray(b.mentions) ? b.mentions.map(Number).filter((n: number) => n > 0 && n !== me.id) : [];
  const mentions = await projectUserIds(t.project_id, wanted);
  await q("INSERT INTO task_comments (task_id, user_id, body, mentions) VALUES ($1,$2,$3,$4)", [t.id, me.id, body, mentions]);
  await notify(mentions, me.id, t.id, t.project_id, "mention", `${me.name} mentioned you on: ${t.title}`);
  await notify([t.assignee_id, t.created_by].filter((u) => !mentions.includes(u)), me.id, t.id, t.project_id, "comment", `${me.name} commented on: ${t.title}`);
  return NextResponse.json({ ok: true });
}
