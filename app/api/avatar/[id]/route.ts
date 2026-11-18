import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q1 } from "@/lib/db";

// Serves a user's DP as an image so chat lists stay small.
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const row = await q1<{ picture: string | null }>("SELECT picture FROM users WHERE id=$1", [id]);
  const m = row?.picture?.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!m) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(m[2], "base64")), { headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=60" } });
}
