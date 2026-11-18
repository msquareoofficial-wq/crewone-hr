import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { q } from "@/lib/db";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || !can(me, "notifications")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const b = await req.json();
  const title = String(b.title || "").trim(), body = String(b.body || "").trim();
  if (!title || !body) return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  await q("UPDATE notifications SET title=$2, body=$3 WHERE id=$1", [id, title.slice(0, 200), body.slice(0, 5000)]);
  return NextResponse.json({ ok: true });
}

// Deleting a holiday notification also removes its holiday dates (ON DELETE CASCADE).
export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || !can(me, "notifications")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await q("DELETE FROM notifications WHERE id=$1", [id]);
  return NextResponse.json({ ok: true });
}
