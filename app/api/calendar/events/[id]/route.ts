// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q1 } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ev = await q1<{ created_by: number }>("SELECT created_by FROM calendar_events WHERE id=$1", [id]);
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ev.created_by !== me.id && me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json();
  if (!b.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  await q1(
    `UPDATE calendar_events SET title=$2, description=$3, start_dt=$4, end_dt=$5, color=$6, all_day=$7, visibility=$8 WHERE id=$1`,
    [
      id,
      b.title.trim(),
      b.description || null,
      b.start_dt,
      b.end_dt,
      b.color || "#4f46e5",
      b.all_day ?? false,
      b.visibility === "team" ? "team" : "personal"
    ]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ev = await q1<{ created_by: number }>("SELECT created_by FROM calendar_events WHERE id=$1", [id]);
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ev.created_by !== me.id && me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await q1("DELETE FROM calendar_events WHERE id=$1", [id]);
  return NextResponse.json({ ok: true });
}
