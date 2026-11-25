// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";

async function markPolicyUpdated() {
  await q(
    "INSERT INTO settings (key, value) VALUES ('policy_last_updated', $1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
    [new Date().toISOString()]
  );
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { title, body, sort_order } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  await q(
    "UPDATE policy_points SET title=$1, body=$2, sort_order=$3 WHERE id=$4",
    [title.trim(), (body ?? "").trim(), Number(sort_order ?? 0), Number(id)]
  );
  await markPolicyUpdated();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await q("DELETE FROM policy_points WHERE id=$1", [Number(id)]);
  await markPolicyUpdated();
  return NextResponse.json({ ok: true });
}
