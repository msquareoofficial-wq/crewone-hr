// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import { fmtTime, fmtDur } from "@/lib/time";
import { catLabel } from "@/lib/breakcats";

const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// CSV of every break in a month. Admin (or reports permission) can export one user or everyone; a user only their own.
export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const month = url.searchParams.get("month") || "";
  if (!/^[0-9]{4}-[0-9]{2}$/.test(month)) return NextResponse.json({ error: "month=YYYY-MM is required" }, { status: 400 });
  const s = await getSettings();
  let users: any[];
  if (can(me, "reports")) {
    const uid = url.searchParams.get("userId");
    if (uid && !/^[0-9]+$/.test(uid)) return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    const dept = url.searchParams.get("dept");
    const where = uid ? "AND id=$1 " : dept === "Sales" || dept === "Production" ? "AND department=$1 " : "";
    users = await q("SELECT id, emp_id, name, department FROM users WHERE role='user' " + where + "ORDER BY emp_id", uid ? [uid] : where ? [dept] : []);
  } else users = [{ id: me.id, emp_id: me.emp_id, name: me.name, department: me.department }];
  const lines = [["Emp ID", "Name", "Department", "Date", "Category", "Start", "End", "Time"].map(esc).join(",")];
  for (const u of users) {
    const rows = await q<any>(
      "SELECT work_date, category, start_at, end_at, EXTRACT(EPOCH FROM (COALESCE(end_at, now()) - start_at))::int AS secs FROM breaks WHERE user_id=$1 AND work_date LIKE $2 ORDER BY work_date, start_at",
      [u.id, month + "-%"]
    );
    for (const r of rows) lines.push([u.emp_id, u.name, u.department, r.work_date, catLabel(r.category), fmtTime(r.start_at, s.timezone), r.end_at ? fmtTime(r.end_at, s.timezone) : "Running", fmtDur(r.secs)].map(esc).join(","));
  }
  return new NextResponse(lines.join(String.fromCharCode(10)), { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="breaks-${month}.csv"` } });
}
