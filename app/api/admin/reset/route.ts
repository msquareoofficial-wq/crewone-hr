// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";

// Admin only. Deletes test data but never users, admin account, settings or logos.
// { scopes:[attendance|leaves|payroll|notifications|chat], month?:"YYYY-MM" (empty = everything), confirm:"RESET" }
export async function POST(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (b.confirm !== "RESET") return NextResponse.json({ error: 'Type RESET to confirm' }, { status: 400 });
  const scopes: string[] = Array.isArray(b.scopes) ? b.scopes : [];
  if (!scopes.length) return NextResponse.json({ error: "Select what to reset" }, { status: 400 });
  const month = b.month ? String(b.month) : "";
  if (month && !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  const like = month ? month + "-%" : "%";
  if (scopes.includes("attendance")) {
    await q("DELETE FROM breaks WHERE work_date LIKE $1", [like]);
    await q("DELETE FROM tasks WHERE work_date LIKE $1", [like]);
    await q("DELETE FROM attendance WHERE work_date LIKE $1", [like]);
  }
  if (scopes.includes("leaves")) await q("DELETE FROM leave_requests WHERE start_date LIKE $1", [like]);
  if (scopes.includes("payroll")) await q("DELETE FROM payroll WHERE month LIKE $1", [month ? month : "%"]);
  if (scopes.includes("notifications")) { await q("DELETE FROM notifications"); await q("DELETE FROM holidays"); }
  if (scopes.includes("chat")) { await q("DELETE FROM chat_rooms"); await q("DELETE FROM chat_files"); }
  return NextResponse.json({ ok: true });
}
