// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import { monthSummary } from "@/lib/hr";
import { fmtTime, fmtDur } from "@/lib/time";

const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// CSV export. Admin can export any user or everyone; a user can export only their own month.
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
    users = await q("SELECT id, emp_id, name, department FROM users WHERE role='user' " + (uid ? "AND id=$1 " : "") + "ORDER BY emp_id", uid ? [uid] : []);
  } else users = [{ id: me.id, emp_id: me.emp_id, name: me.name, department: me.department }];

  const lines = [["Emp ID","Name","Department","Date","Sign In","Sign Out","IP","Late","Late Minutes","Breaks","Break Time","Tasks","Task Time"].map(esc).join(",")];
  for (const u of users) {
    const sum = await monthSummary(u.id, month);
    for (const r of [...sum.rows].reverse())
      lines.push([u.emp_id, u.name, u.department, r.work_date, fmtTime(r.sign_in, s.timezone), fmtTime(r.sign_out, s.timezone) + (r.auto_out ? " (auto)" : ""), r.ip, r.late ? "Yes" : "No", r.late_minutes, r.break_count, fmtDur(r.break_seconds), r.task_count, fmtDur(r.task_seconds)].map(esc).join(","));
    lines.push([u.emp_id, u.name, "", "TOTAL", "", "", "", `${sum.lates} lates`, "", sum.breakCount, fmtDur(sum.breakSeconds), "", `${sum.offs} off(s) deducted`].map(esc).join(","));
  }
  return new NextResponse(lines.join(String.fromCharCode(10)), { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="attendance-${month}.csv"` } });
}
