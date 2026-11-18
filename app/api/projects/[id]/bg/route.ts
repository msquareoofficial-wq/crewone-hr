// Powered By Vistech Force
// Per-user background for a project board. Value formats:
//   c:#rrggbb            solid colour
//   g:#rrggbb,#rrggbb    diagonal gradient
//   i:data:image/...     cropped picture (data URL)
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { projectFor } from "@/lib/projects";

const OK = /^(c:#[0-9a-fA-F]{6}|g:#[0-9a-fA-F]{6},#[0-9a-fA-F]{6}|i:data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  if (!(await projectFor(me, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await q1<{ bg: string | null }>("SELECT bg FROM project_prefs WHERE project_id=$1 AND user_id=$2", [id, me.id]);
  return NextResponse.json({ bg: r?.bg ?? null });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  if (!(await projectFor(me, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const bg = b.bg === null ? null : typeof b.bg === "string" ? b.bg : undefined;
  if (bg === undefined || (bg !== null && (bg.length > 700_000 || !OK.test(bg)))) return NextResponse.json({ error: "Invalid background" }, { status: 400 });
  await q1(
    "INSERT INTO project_prefs (project_id, user_id, bg) VALUES ($1,$2,$3) ON CONFLICT (project_id, user_id) DO UPDATE SET bg=EXCLUDED.bg",
    [id, me.id, bg]);
  return NextResponse.json({ ok: true, bg });
}
