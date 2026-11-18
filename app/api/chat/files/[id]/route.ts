import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1, pool } from "@/lib/db";

// Step 2: PUT raw bytes of one chunk (max ~3.5 MB each) to ?idx=N
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  const idx = Number(new URL(req.url).searchParams.get("idx"));
  const f = await q1<{ size: number }>("SELECT size FROM chat_files WHERE id=$1 AND uploader_id=$2", [id, me.id]);
  if (!f || !Number.isInteger(idx) || idx < 0 || idx > 40) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length || buf.length > 4 * 1024 * 1024) return NextResponse.json({ error: "Invalid chunk" }, { status: 400 });
  await q("INSERT INTO chat_file_chunks (file_id, idx, data) VALUES ($1,$2,$3) ON CONFLICT (file_id, idx) DO UPDATE SET data=EXCLUDED.data", [id, idx, buf]);
  return NextResponse.json({ ok: true });
}

// Download. Only members of a chat that contains this file (or the uploader) can open it.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  const id = Number((await ctx.params).id);
  const f = await q1<{ name: string; size: number; mime: string | null }>(
    `SELECT f.name, f.size, f.mime FROM chat_files f WHERE f.id=$1 AND (f.uploader_id=$2 OR EXISTS (
       SELECT 1 FROM chat_messages c JOIN chat_members m ON m.room_id=c.room_id AND m.user_id=$2 WHERE c.file_url=$3)
       OR EXISTS (SELECT 1 FROM task_files tf JOIN project_tasks t ON t.id=tf.task_id WHERE tf.file_id=f.id AND ($4::boolean OR EXISTS (
         SELECT 1 FROM project_members pm WHERE pm.project_id=t.project_id AND pm.user_id=$2))))`,
    [id, me.id, `/api/chat/files/${id}`, me.role === "admin"]);
  if (!f) return new NextResponse("Not found", { status: 404 });
  const forceDownload = new URL(req.url).searchParams.get("download") === "1";
  const safeImage = !!f.mime && /^image\/(png|jpe?g|gif|webp|bmp)$/i.test(f.mime);
  const inline = safeImage && !forceDownload;
  const count = (await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM chat_file_chunks WHERE file_id=$1", [id]))!.n;
  let i = 0;
  const stream = new ReadableStream({
    async pull(controller) {
      if (i >= count) return controller.close();
      const r = await pool.query("SELECT data FROM chat_file_chunks WHERE file_id=$1 AND idx=$2", [id, i++]);
      if (r.rows[0]) controller.enqueue(new Uint8Array(r.rows[0].data));
    },
  });
  return new NextResponse(stream, {
    headers: {
      "Content-Type": inline ? f.mime! : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "Content-Length": String(f.size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
