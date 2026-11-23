// Powered By Vistech Force
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, PERM_KEYS } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { genPassword, nextEmpId } from "@/lib/hr";

const FIELDS = ["name","pseudo_name","phone","office_phone","email","office_email","pseudo_email","cnic","joining_date","department","designation","shift_start","shift_end","shift_type","grace_minutes","picture"] as const;

export async function POST(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.name?.trim() || !b.email?.trim()) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  if (b.department && !["Sales", "Production"].includes(b.department)) return NextResponse.json({ error: "Department must be Sales or Production" }, { status: 400 });
  if (b.picture && String(b.picture).length > 700_000) return NextResponse.json({ error: "Picture is too large (max ~500KB)" }, { status: 400 });
  const dup = await q1("SELECT id FROM users WHERE LOWER(email)=LOWER($1)", [b.email.trim()]);
  if (dup) return NextResponse.json({ error: "This email already exists" }, { status: 409 });
  const empId = await nextEmpId();
  const password = genPassword();
  const hash = await bcrypt.hash(password, 10);
  const vals = FIELDS.map((f) => (b[f] === "" || b[f] === undefined ? null : b[f]));
  const user = await q1<{ id: number }>(
    `INSERT INTO users (emp_id, role, password_hash, ${FIELDS.join(",")})
     VALUES ($1,'user',$2, ${FIELDS.map((_, i) => "$" + (i + 3)).join(",")}) RETURNING id`,
    [empId, hash, ...vals.map((v, i) => (FIELDS[i] === "shift_start" ? v || "09:00" : FIELDS[i] === "shift_end" ? v || "17:00" : FIELDS[i] === "shift_type" ? (v === "hybrid" ? "hybrid" : "fixed") : v))]
  );
  const perms = Array.isArray(b.perms) ? b.perms.filter((x: any) => PERM_KEYS.includes(x)) : [];
  if (perms.length) await q1("UPDATE users SET perms=$2::text[] WHERE id=$1 RETURNING id", [user!.id, perms]);
  // password is shown to admin only once
  return NextResponse.json({ id: user!.id, emp_id: empId, password });
}
