// Powered By Vistech Force
import { q, q1 } from "./db";
import type { SessionUser } from "./auth";

export const STATUSES = ["todo", "doing", "review", "done"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export async function projectFor(me: SessionUser, id: number) {
  if (!id) return null;
  return q1<any>(
    `SELECT p.* FROM projects p WHERE p.id=$1 AND ($2::boolean OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id=p.id AND m.user_id=$3))`,
    [id, me.role === "admin", me.id]);
}

export async function validAssignee(projectId: number, userId: number | null) {
  if (!userId) return true;
  const r = await q1("SELECT 1 FROM users u WHERE u.id=$1 AND u.active=TRUE AND (u.role='admin' OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id=$2 AND m.user_id=u.id))", [userId, projectId]);
  return !!r;
}

export const cleanDate = (v: any) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export const cleanLabels = (v: any): string[] =>
  Array.isArray(v) ? Array.from(new Set(v.map((x) => String(x).trim().slice(0, 24)).filter(Boolean))).slice(0, 8) : [];

// Keeps only ids of active users who can see the project (members or admins)
export async function projectUserIds(projectId: number, ids: number[]) {
  if (!ids.length) return [] as number[];
  const rows = await q<{ id: number }>(
    "SELECT u.id FROM users u WHERE u.active=TRUE AND u.id = ANY($1) AND (u.role='admin' OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id=$2 AND m.user_id=u.id))",
    [ids, projectId]);
  return rows.map((r) => r.id);
}

export async function notify(userIds: (number | null | undefined)[], actorId: number, taskId: number, projectId: number, kind: string, text: string) {
  const to = Array.from(new Set(userIds.filter((n): n is number => !!n && n !== actorId)));
  for (const u of to) await q("INSERT INTO task_notifs (user_id, task_id, project_id, kind, text) VALUES ($1,$2,$3,$4,$5)", [u, taskId, projectId, kind, text.slice(0, 200)]);
}

export const RECURS = ["daily", "weekly", "monthly"] as const;
export const cleanRecur = (v: any) => ((RECURS as readonly string[]).includes(v) ? (v as string) : null);

export async function logAct(taskId: number, userId: number | null, text: string) {
  await q("INSERT INTO task_activity (task_id, user_id, text) VALUES ($1,$2,$3)", [taskId, userId, text.slice(0, 300)]);
}

// true if making taskId depend on deps would create a loop
export async function createsCycle(taskId: number, deps: number[]) {
  const seen = new Set<number>();
  let frontier = deps;
  while (frontier.length) {
    if (frontier.includes(taskId)) return true;
    const next = frontier.filter((i) => !seen.has(i));
    next.forEach((i) => seen.add(i));
    if (!next.length) break;
    const rows = await q<{ blocked_by: number[] }>("SELECT blocked_by FROM project_tasks WHERE id = ANY($1)", [next]);
    frontier = rows.flatMap((r) => r.blocked_by || []);
  }
  return false;
}

// Keeps only ids of tasks that belong to the project (and are not the task itself)
export async function cleanDeps(projectId: number, selfId: number | null, v: any) {
  const want = Array.from(new Set((Array.isArray(v) ? v : []).map(Number).filter((n: number) => n > 0 && n !== selfId))).slice(0, 20) as number[];
  if (!want.length) return [] as number[];
  const rows = await q<{ id: number }>("SELECT id FROM project_tasks WHERE project_id=$1 AND id = ANY($2)", [projectId, want]);
  return rows.map((r) => r.id);
}

export async function openBlockers(deps: number[]) {
  if (!deps.length) return [] as string[];
  const rows = await q<{ title: string }>("SELECT title FROM project_tasks WHERE id = ANY($1) AND status<>'done'", [deps]);
  return rows.map((r) => r.title);
}

// Powered By Vistech Force
// ---- Boards: a project can have many boards, each with its own columns ----
export const DEFAULT_COLS: [string, string][] = [["todo", "To Do"], ["doing", "In Progress"], ["review", "Review"], ["done", "Done"]];
export const LOCKED_COLS = ["todo", "done"]; // these two always exist (new tasks start in todo, done means completed)

export async function addBoard(projectId: number, name: string) {
  const b = await q1<{ id: number }>(
    "INSERT INTO project_boards (project_id, name, position) VALUES ($1,$2,(SELECT COALESCE(MAX(position),0)+1 FROM project_boards WHERE project_id=$1)) RETURNING id",
    [projectId, name]);
  for (let i = 0; i < DEFAULT_COLS.length; i++) await q("INSERT INTO board_cols (board_id, key, name, position) VALUES ($1,$2,$3,$4)", [b!.id, DEFAULT_COLS[i][0], DEFAULT_COLS[i][1], i]);
  return b!.id;
}

// Every project always has at least one board; old tasks are moved onto the first one.
export async function ensureBoards(projectId: number) {
  const first = await q1<{ id: number }>("SELECT id FROM project_boards WHERE project_id=$1 ORDER BY position, id LIMIT 1", [projectId]);
  const id = first ? first.id : await addBoard(projectId, "Main board");
  await q("UPDATE project_tasks SET board_id=$2 WHERE project_id=$1 AND board_id IS NULL", [projectId, id]);
  return id;
}

export async function boardIn(projectId: number, boardId: number) {
  if (!boardId) return null;
  return q1<any>("SELECT * FROM project_boards WHERE id=$1 AND project_id=$2", [boardId, projectId]);
}

export async function colKeys(boardId: number | null): Promise<string[]> {
  if (!boardId) return DEFAULT_COLS.map((c) => c[0]);
  const rows = await q<{ key: string }>("SELECT key FROM board_cols WHERE board_id=$1", [boardId]);
  return rows.length ? rows.map((r) => r.key) : DEFAULT_COLS.map((c) => c[0]);
}

export async function colName(boardId: number | null, key: string) {
  const r = boardId ? await q1<{ name: string }>("SELECT name FROM board_cols WHERE board_id=$1 AND key=$2", [boardId, key]) : null;
  return r?.name ?? DEFAULT_COLS.find((c) => c[0] === key)?.[1] ?? key;
}
