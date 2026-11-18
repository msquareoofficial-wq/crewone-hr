// Powered By Vistech Force
// Manage boards and columns of a project.
// POST { action: add_board | rename_board | delete_board | add_col | rename_col | delete_col | move_col, ... }
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { projectFor, boardIn, addBoard, ensureBoards, LOCKED_COLS } from "@/lib/projects";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const clean = (v: any, n: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, n);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return bad("Unauthorized", 401);
  const id = Number((await ctx.params).id);
  const project = await projectFor(me, id);
  if (!project) return bad("Not found", 404);
  if (project.archived) return bad("This project is archived");
  await ensureBoards(id);
  const b = await req.json();
  const action = String(b.action || "");

  if (action === "add_board") {
    const name = clean(b.name, 60);
    if (!name) return bad("Enter a board name");
    const n = await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM project_boards WHERE project_id=$1", [id]);
    if ((n?.n ?? 0) >= 30) return bad("A project can have up to 30 boards");
    return NextResponse.json({ id: await addBoard(id, name) });
  }

  const board = await boardIn(id, Number(b.board_id));
  if (!board) return bad("Board not found", 404);

  if (action === "rename_board") {
    const name = clean(b.name, 60);
    if (!name) return bad("Enter a board name");
    await q("UPDATE project_boards SET name=$2 WHERE id=$1", [board.id, name]);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_board") {
    if (me.role !== "admin") return bad("Only admin can delete a board", 403);
    const n = await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM project_boards WHERE project_id=$1", [id]);
    if ((n?.n ?? 0) <= 1) return bad("A project needs at least one board");
    await q("DELETE FROM project_boards WHERE id=$1", [board.id]);
    return NextResponse.json({ ok: true });
  }

  if (action === "add_col") {
    const name = clean(b.name, 40);
    if (!name) return bad("Enter a column name");
    const n = await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM board_cols WHERE board_id=$1", [board.id]);
    if ((n?.n ?? 0) >= 15) return bad("A board can have up to 15 columns");
    const done = await q1<{ position: number }>("SELECT position FROM board_cols WHERE board_id=$1 AND key='done'", [board.id]);
    const pos = done ? done.position : (n?.n ?? 0);
    await q("UPDATE board_cols SET position=position+1 WHERE board_id=$1 AND position>=$2", [board.id, pos]);
    const key = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    await q("INSERT INTO board_cols (board_id, key, name, position) VALUES ($1,$2,$3,$4)", [board.id, key, name, pos]);
    return NextResponse.json({ key });
  }

  const key = String(b.key || "");
  const col = await q1<any>("SELECT * FROM board_cols WHERE board_id=$1 AND key=$2", [board.id, key]);
  if (!col) return bad("Column not found", 404);

  if (action === "rename_col") {
    const name = clean(b.name, 40);
    if (!name) return bad("Enter a column name");
    await q("UPDATE board_cols SET name=$3 WHERE board_id=$1 AND key=$2", [board.id, key, name]);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_col") {
    if (LOCKED_COLS.includes(key)) return bad("This column cannot be deleted, but you can rename it");
    // tasks of the deleted column go back to the To Do column
    await q("UPDATE project_tasks SET status='todo', completed_at=NULL, updated_at=now() WHERE board_id=$1 AND status=$2", [board.id, key]);
    await q("DELETE FROM board_cols WHERE board_id=$1 AND key=$2", [board.id, key]);
    return NextResponse.json({ ok: true });
  }

  if (action === "move_col") {
    const dir = b.dir === "left" ? -1 : 1;
    const cols = await q<any>("SELECT id, key FROM board_cols WHERE board_id=$1 ORDER BY position, id", [board.id]);
    const i = cols.findIndex((c: any) => c.key === key);
    const j = i + dir;
    if (j < 0 || j >= cols.length) return NextResponse.json({ ok: true });
    [cols[i], cols[j]] = [cols[j], cols[i]];
    for (let k = 0; k < cols.length; k++) await q("UPDATE board_cols SET position=$2 WHERE id=$1", [cols[k].id, k]);
    return NextResponse.json({ ok: true });
  }

  return bad("Unknown action");
}
