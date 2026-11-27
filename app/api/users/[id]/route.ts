import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, PERM_KEYS } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { genPassword, todayDate } from "@/lib/hr";
import { logActivity } from "@/lib/activity";

const FIELDS = ["name","pseudo_name","phone","office_phone","email","office_email","pseudo_email","cnic","joining_date","department","designation","shift_start","shift_end","shift_type","grace_minutes","leave_quota","picture","emergency_contact_name","emergency_contact_phone"] as const;

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const b = await req.json();
  if (b.resetPassword) {
    const pw = genPassword();
    await q("UPDATE users SET password_hash=$2, plain_password=$3 WHERE id=$1", [id, await bcrypt.hash(pw, 10), pw]);
    return NextResponse.json({ password: pw });
  }
  if (b.reopenDay) {
    const d = await todayDate();
    await q("UPDATE attendance SET sign_out=NULL WHERE user_id=$1 AND work_date=$2 AND sign_out IS NOT NULL", [id, d]);
    const a = await q1<any>("SELECT sign_out FROM attendance WHERE user_id=$1 AND work_date=$2", [id, d]);
    if (!a) return NextResponse.json({ error: "This user has not marked IN today" }, { status: 400 });
    await logActivity(me.id, "attendance", "Re-opened a user's day (Undo OUT)", `user id ${id}, ${d}`);
    return NextResponse.json({ ok: true });
  }
  if (typeof b.active === "boolean") {
    if (Number(id) === me.id) return NextResponse.json({ error: "You cannot deactivate yourself" }, { status: 400 });
    await q("UPDATE users SET active=$2 WHERE id=$1", [id, b.active]);
    return NextResponse.json({ ok: true });
  }
  if (b.department && !["Sales", "Production"].includes(b.department)) return NextResponse.json({ error: "Invalid department" }, { status: 400 });
  if (b.picture && String(b.picture).length > 700_000) return NextResponse.json({ error: "Picture is too large" }, { status: 400 });
  const sets: string[] = [];
  const vals: any[] = [id];
  for (const f of FIELDS) {
    if (f in b) {
      vals.push(f === "shift_type" ? (b[f] === "hybrid" ? "hybrid" : "fixed") : f.startsWith("shift_") && b[f] === "" ? (f === "shift_start" ? "09:00" : "17:00") : b[f] === "" ? null : b[f]);
      sets.push(`${f}=$${vals.length}`);
    }
  }
  if (Array.isArray(b.perms)) {
    vals.push(b.perms.filter((x: any) => PERM_KEYS.includes(x)));
    sets.push(`perms=$${vals.length}::text[]`);
  }
  if (!sets.length) return NextResponse.json({ error: "Nothing changed" }, { status: 400 });
  const dup = b.email ? await q1("SELECT id FROM users WHERE LOWER(email)=LOWER($2) AND id<>$1", [id, b.email]) : null;
  if (dup) return NextResponse.json({ error: "This email already exists" }, { status: 409 });
  await q(`UPDATE users SET ${sets.join(",")} WHERE id=$1`, vals);
  return NextResponse.json({ ok: true });
}
