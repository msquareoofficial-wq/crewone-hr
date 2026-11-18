import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { canSeeNotification } from "@/lib/hr";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canSeeNotification(me, Number(id)))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = String((await req.json()).body || "").trim();
  if (!body) return NextResponse.json({ error: "Comment is empty" }, { status: 400 });
  await q("INSERT INTO notification_comments (notification_id, user_id, body) VALUES ($1,$2,$3)", [id, me.id, body.slice(0, 2000)]);
  return NextResponse.json({ ok: true });
}

// Admin can remove any comment; a user can remove their own.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const cid = Number(new URL(req.url).searchParams.get("commentId"));
  if (me.role === "admin") await q("DELETE FROM notification_comments WHERE id=$1 AND notification_id=$2", [cid, id]);
  else await q("DELETE FROM notification_comments WHERE id=$1 AND notification_id=$2 AND user_id=$3", [cid, id, me.id]);
  return NextResponse.json({ ok: true });
}
