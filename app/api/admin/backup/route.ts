// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { logActivity } from "@/lib/activity";

// Admin only. JSON export of the main tables. Passwords and picture/file blobs are left out.
export async function GET() {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out: Record<string, any[]> = {};
  out.users = await q("SELECT id, emp_id, role, name, pseudo_name, phone, office_phone, email, office_email, pseudo_email, cnic, joining_date, department, designation, shift_start, shift_end, shift_type, active, created_at FROM users ORDER BY id");
  const tables: [string, string][] = [
    ["settings", "SELECT * FROM settings"],
    ["attendance", "SELECT * FROM attendance ORDER BY id"],
    ["breaks", "SELECT * FROM breaks ORDER BY id"],
    ["tasks", "SELECT * FROM tasks ORDER BY id"],
    ["leave_requests", "SELECT * FROM leave_requests ORDER BY id"],
    ["attendance_corrections", "SELECT * FROM attendance_corrections ORDER BY id"],
    ["holidays", "SELECT * FROM holidays ORDER BY id"],
    ["notifications", "SELECT * FROM notifications ORDER BY id"],
    ["payroll", "SELECT * FROM payroll ORDER BY id"],
    ["projects", "SELECT * FROM projects ORDER BY id"],
    ["project_tasks", "SELECT * FROM project_tasks ORDER BY id"],
    ["activity_log", "SELECT * FROM activity_log ORDER BY id"],
  ];
  for (const [k, sql] of tables) { try { out[k] = await q(sql); } catch { out[k] = []; } }
  await logActivity(me.id, "profile", "Downloaded data backup");
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), tables: out }, null, 1), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="crewone-backup-${day}.json"` },
  });
}
