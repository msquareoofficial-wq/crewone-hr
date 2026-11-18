import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { q } from "@/lib/db";

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || !can(me, "notifications")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await q("DELETE FROM holidays WHERE id=$1", [id]);
  return NextResponse.json({ ok: true });
}
