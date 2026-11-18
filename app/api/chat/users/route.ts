// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { onlineExpr, todayDate } from "@/lib/hr";

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = await todayDate();
  const users = await q<any>(
    `SELECT u.id, u.name, u.emp_id, u.role, u.department, u.status_text, (u.picture IS NOT NULL) AS has_picture, ${onlineExpr("$2")} AS online
     FROM users u WHERE u.active=TRUE AND u.id<>$1 ORDER BY u.name`, [me.id, d]);
  return NextResponse.json({ users });
}
