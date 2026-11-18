// Powered By Vistech Force
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { q1 } from "@/lib/db";
import { createSession, getIp } from "@/lib/auth";

// Logging in does NOT mark attendance. Users click IN on their dashboard.
export async function POST(req: Request) {
  const { identifier, password } = await req.json();
  if (!identifier || !password) return NextResponse.json({ error: "ID/email and password are required" }, { status: 400 });
  const id = String(identifier).trim();
  const user = await q1<any>(
    "SELECT * FROM users WHERE active=TRUE AND (LOWER(emp_id)=LOWER($1) OR LOWER(email)=LOWER($1) OR LOWER(office_email)=LOWER($1))",
    [id]
  );
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
    if (user) await logActivity(user.id, "auth", "Failed login attempt (wrong password)", null, getIp(req));
    return NextResponse.json({ error: "Incorrect ID or password" }, { status: 401 });
  }
  await createSession(user.id);
  await logActivity(user.id, "auth", "Logged in", null, getIp(req));
  return NextResponse.json({ role: user.role });
}
