// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q1 } from "@/lib/db";

const MAX_FILE = 50 * 1024 * 1024;

// Step 1 of an upload: { name, size, type } -> { id }. Chunks are then sent to /api/chat/files/<id>?idx=N
export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  const size = Number(b.size);
  if (!(size >= 0) || size > MAX_FILE) return NextResponse.json({ error: "File is too large (max 50 MB)" }, { status: 400 });
  const f = await q1<{ id: number }>("INSERT INTO chat_files (uploader_id, name, size, mime) VALUES ($1,$2,$3,$4) RETURNING id",
    [me.id, String(b.name || "file").slice(0, 255), Math.round(size), String(b.type || "application/octet-stream").slice(0, 120)]);
  return NextResponse.json({ id: f!.id });
}
