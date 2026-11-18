// Powered By Vistech Force
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";

// Users maintain their own profile (limited fields). Core HR fields stay admin-only.
const SELF = ["pseudo_name", "phone", "picture", "status_text"] as const;

export async function PUT(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (b.newPassword) {
    const row = await q1<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=$1", [me.id]);
    if (!row || !(await bcrypt.compare(String(b.currentPassword || ""), row.password_hash))) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    if (String(b.newPassword).length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    await q("UPDATE users SET password_hash=$2 WHERE id=$1", [me.id, await bcrypt.hash(String(b.newPassword), 10)]);
    await logActivity(me.id, "profile", "Changed own password");
    return NextResponse.json({ ok: true });
  }
  if (b.picture && String(b.picture).length > 700_000) return NextResponse.json({ error: "Picture is too large" }, { status: 400 });
  if (me.role === "admin" && "name" in b && !String(b.name).trim()) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  if ("status_text" in b) b.status_text = String(b.status_text || "").trim().slice(0, 80);
  const sets: string[] = [];
  const vals: any[] = [me.id];
  if (me.role === "admin") for (const f of ["name", "designation"] as const) if (f in b) { vals.push(String(b[f]).trim() || null); sets.push(`${f}=$${vals.length}`); }
  for (const f of SELF) if (f in b) { vals.push(b[f] === "" ? null : b[f]); sets.push(`${f}=$${vals.length}`); }
  if (sets.length) {
    await q(`UPDATE users SET ${sets.join(",")} WHERE id=$1`, vals);
    await logActivity(me.id, "profile", "picture" in b ? "Updated profile picture" : "status_text" in b ? "Updated status" : "Updated profile", "status_text" in b && b.status_text ? String(b.status_text) : null);
  }
  return NextResponse.json({ ok: true });
}
