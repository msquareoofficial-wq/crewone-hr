// Powered By Vistech Force
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { currentMonth } from "@/lib/hr";
import { buildLedger, clampRange, lineDue } from "@/lib/finance";

export async function GET(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "admin") return new Response("Unauthorized", { status: 401 });
  const s = await getSettings();
  const u = new URL(req.url).searchParams;
  const { from, to } = clampRange(u.get("from"), u.get("to"), currentMonth(s.timezone));
  const emp = (u.get("emp") || "").trim().toLowerCase();
  const st = u.get("status");
  const status = st === "paid" || st === "pending" ? st : "all";
  const L = await buildLedger(from, to, emp, status);
  const NL = String.fromCharCode(10);
  const c = (v: any) => '"' + String(v ?? "").split('"').join('""') + '"';
  const out: string[] = [];
  out.push([`Finance ledger ${from} to ${to}`, emp ? "Employee: " + (L.people[0] ? L.people[0].name : emp) : "All employees", "Status: " + status].map(c).join(","));
  out.push("");
  out.push(["Staff ledger"].map(c).join(","));
  out.push(["Month", "Employee", "Department", "Salary", "Commission", "Total pay", "Status", "Paid on"].map(c).join(","));
  L.staff.forEach((r) => out.push([r.month, r.name, r.dept, r.amount, r.commission, lineDue(r), r.paid ? "Paid" : "Pending", r.paid_on].map(c).join(",")));
  out.push(["Total", "", "", "", "", L.people.reduce((a, p) => a + p.due, 0), "Paid " + L.people.reduce((a, p) => a + p.paid, 0), ""].map(c).join(","));
  out.push("");
  out.push(["Employee summary"].map(c).join(","));
  out.push(["Employee", "Department", "Months", "Total due", "Paid", "Pending"].map(c).join(","));
  L.people.forEach((p) => out.push([p.name, p.dept, p.months, p.due, p.paid, p.due - p.paid].map(c).join(",")));
  if (!emp) {
    out.push("");
    out.push(["Month by month (company)"].map(c).join(","));
    out.push(["Month", "Salaries", "Commission", "Office expense", "Spending", "Total", "Paid", "Pending"].map(c).join(","));
    L.monthly.forEach((m) => out.push([m.month, m.salary, m.comm, m.exp, m.spend, m.total, m.paid, m.pending].map(c).join(",")));
    out.push("");
    out.push(["Office expense and spending lines"].map(c).join(","));
    out.push(["Month", "Section", "Date", "Title", "Category", "Amount", "Status", "Paid on"].map(c).join(","));
    L.all.filter((r) => r.section !== "salary" && (status === "all" || (status === "paid") === r.paid)).forEach((r) => out.push([r.month, r.section === "expense" ? "Office expense" : "Spending", r.spent_on, r.name, r.dept, r.amount, r.paid ? "Paid" : "Pending", r.paid_on].map(c).join(",")));
  }
  return new Response(out.join(NL), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="finance-ledger-${from}-to-${to}.csv"` } });
}
