// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { savePayroll } from "@/lib/payroll";

async function admin() {
  const me = await getSession();
  return me && me.role === "admin" ? me : null;
}
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const okMonth = (m: any) => typeof m === "string" && /^\d{4}-\d{2}$/.test(m);

// POST { action:"generate", month } auto-calculates all users (manual rows are kept).
// POST { action:"recalc", id } resets one row back to automatic values.
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (b.action === "generate") {
    if (!okMonth(b.month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    const users = await q<{ id: number }>("SELECT id FROM users WHERE role='user' AND active=TRUE");
    let n = 0;
    for (const u of users) {
      const ex = await q1<{ manual: boolean; status: string; bonus: string; other_deduction: string; note: string | null }>("SELECT manual, status, bonus, other_deduction, note FROM payroll WHERE user_id=$1 AND month=$2", [u.id, b.month]);
      if (ex && (ex.manual || ex.status === "paid")) continue;
      await savePayroll(u.id, b.month, ex ? { bonus: Number(ex.bonus), other_deduction: Number(ex.other_deduction), note: ex.note } : undefined);
      n++;
    }
    return NextResponse.json({ ok: true, count: n });
  }
  if (b.action === "recalc") {
    const row = await q1<any>("SELECT * FROM payroll WHERE id=$1", [b.id]);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await savePayroll(row.user_id, row.month, { bonus: Number(row.bonus), other_deduction: Number(row.other_deduction), note: row.note, status: row.status });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// PUT { userId, monthly_salary } | { weekly_off, leaves_paid } | { id, status } | { id, ...manual fields }
export async function PUT(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (b.userId !== undefined) {
    const s = num(b.monthly_salary);
    if (s < 0 || s > 1e9) return NextResponse.json({ error: "Invalid salary" }, { status: 400 });
    await q("UPDATE users SET monthly_salary=$2 WHERE id=$1 AND role='user'", [b.userId, s]);
    return NextResponse.json({ ok: true });
  }
  if (b.weekly_off !== undefined) {
    const w = Number(b.weekly_off);
    if (!(w >= 0 && w <= 7)) return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    await q("INSERT INTO settings (key,value) VALUES ('weekly_off',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [String(w)]);
    await q("INSERT INTO settings (key,value) VALUES ('leaves_paid',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [b.leaves_paid ? "1" : "0"]);
    return NextResponse.json({ ok: true });
  }
  if (b.id && (b.status === "paid" || b.status === "draft")) {
    await q("UPDATE payroll SET status=$2, updated_at=now() WHERE id=$1", [b.id, b.status]);
    return NextResponse.json({ ok: true });
  }
  if (b.id) {
    const f = ["base_salary", "present_days", "leave_days", "absent_days", "late_count", "absent_deduction", "late_deduction", "bonus", "other_deduction", "net_salary"].map((k) => Math.max(0, num(b[k])));
    await q(
      `UPDATE payroll SET base_salary=$2, present_days=$3, leave_days=$4, absent_days=$5, late_count=$6, absent_deduction=$7, late_deduction=$8, bonus=$9, other_deduction=$10, net_salary=$11, note=$12, manual=TRUE, updated_at=now() WHERE id=$1`,
      [b.id, ...f, b.note ? String(b.note).slice(0, 300) : null]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nothing to do" }, { status: 400 });
}

// CSV export: /api/payroll?month=YYYY-MM
export async function GET(req: Request) {
  if (!(await admin())) return new NextResponse("Unauthorized", { status: 401 });
  const month = new URL(req.url).searchParams.get("month") || "";
  if (!okMonth(month)) return new NextResponse("Invalid month", { status: 400 });
  const rows = await q<any>("SELECT u.emp_id, u.name, p.* FROM payroll p JOIN users u ON u.id=p.user_id WHERE p.month=$1 ORDER BY u.name", [month]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Emp ID", "Name", "Base salary", "Working days", "Present", "Leave", "Absent", "Lates", "Absent deduction", "Late deduction", "Bonus", "Other deduction", "Net salary", "Type", "Status", "Note"];
  const lines = rows.map((r) => [r.emp_id, r.name, r.base_salary, r.working_days, r.present_days, r.leave_days, r.absent_days, r.late_count, r.absent_deduction, r.late_deduction, r.bonus, r.other_deduction, r.net_salary, r.manual ? "Manual" : "Auto", r.status, r.note].map(esc).join(","));
  return new NextResponse([head.map(esc).join(","), ...lines].join("\n"), { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="payroll-${month}.csv"` } });
}
