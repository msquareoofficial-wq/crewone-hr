import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { pushTo } from "@/lib/push";

// Admin: approve/reject (with note), or change an earlier decision. User: cancel own pending request.
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || !can(me, "leaves")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const b = await req.json();
  if (!["approved", "rejected", "pending"].includes(b.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  await q("UPDATE leave_requests SET status=$2, admin_note=$3, decided_at=CASE WHEN $2='pending' THEN NULL ELSE now() END WHERE id=$1", [id, b.status, b.note ? String(b.note).slice(0, 500) : null]);
  const lv = await q1<any>("SELECT u.name, l.user_id FROM leave_requests l JOIN users u ON u.id=l.user_id WHERE l.id=$1", [id]);
  await logActivity(me.id, "leave", `Leave marked ${b.status}`, lv ? `For ${lv.name}` : null);
  if (lv && b.status !== "pending") await pushTo([lv.user_id], `Leave ${b.status}`, b.note ? String(b.note) : "Your leave request was " + b.status, "/dashboard");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (can(me, "leaves")) { await q("DELETE FROM leave_requests WHERE id=$1", [id]); return NextResponse.json({ ok: true }); }
  const r = await q1("DELETE FROM leave_requests WHERE id=$1 AND user_id=$2 AND status='pending' RETURNING id", [id, me.id]);
  if (!r) return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
