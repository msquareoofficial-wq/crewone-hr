// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { BRAND, getBrandLogos } from "@/lib/brand";

function fmt(n: number) {
  return Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || me.role !== "admin") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const row = await q1<any>(
    `SELECT p.*, u.name, u.emp_id, u.department, u.designation, u.joining_date
     FROM payroll p JOIN users u ON u.id=p.user_id WHERE p.id=$1`,
    [id]
  );
  if (!row) return new NextResponse("Not found", { status: 404 });

  const logos = await getBrandLogos();
  const logoUrl = logos.dark; // dark logo for light background

  const isPaid = row.status === "paid";
  const rows: [string, string, string?][] = [
    ["Basic Salary", fmt(row.base_salary)],
    ["+ Bonus", fmt(row.bonus), "plus"],
    ["− Absent Deduction", fmt(row.absent_deduction), "minus"],
    ["− Late Deduction", fmt(row.late_deduction), "minus"],
    ["− Other Deduction", fmt(row.other_deduction), "minus"],
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Payslip — ${row.name} — ${fmtMonth(row.month)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 13px; color: #111; background: #f5f5f5; }
  .page { max-width: 760px; margin: 32px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,.12); }
  .header { background: #0f172a; color: #fff; padding: 28px 36px 22px; display: flex; justify-content: space-between; align-items: center; }
  .header img { height: 44px; object-fit: contain; }
  .header-right { text-align: right; }
  .header-right .title { font-size: 20px; font-weight: 700; letter-spacing: .04em; }
  .header-right .month { font-size: 13px; color: #94a3b8; margin-top: 2px; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #e2e8f0; }
  .info-col { padding: 20px 36px; }
  .info-col:first-child { border-right: 1px solid #e2e8f0; }
  .info-label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin-bottom: 10px; font-weight: 600; }
  .info-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
  .info-row span:first-child { color: #475569; }
  .info-row span:last-child { font-weight: 500; }
  .earnings { padding: 20px 36px 0; }
  .earnings-title { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; font-weight: 600; margin-bottom: 12px; }
  .earn-table { width: 100%; border-collapse: collapse; }
  .earn-table td { padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .earn-table td:last-child { text-align: right; font-weight: 500; }
  .earn-table .minus { color: #dc2626; }
  .earn-table .plus { color: #16a34a; }
  .net-row { margin: 20px 36px; background: #0f172a; color: #fff; border-radius: 8px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
  .net-row .net-label { font-size: 14px; font-weight: 600; }
  .net-row .net-amount { font-size: 22px; font-weight: 700; letter-spacing: .02em; }
  .summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin-top: 20px; }
  .summary-cell { padding: 14px 20px; text-align: center; border-right: 1px solid #e2e8f0; }
  .summary-cell:last-child { border-right: none; }
  .summary-cell .sc-num { font-size: 20px; font-weight: 700; color: #0f172a; }
  .summary-cell .sc-label { font-size: 11px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: .04em; }
  .footer { padding: 16px 36px; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 11px; }
  .stamp { position: relative; }
  .stamp-text { display: inline-block; border: 3px solid #16a34a; color: #16a34a; font-size: 15px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; padding: 4px 14px; border-radius: 4px; transform: rotate(-8deg); opacity: .85; }
  .stamp-text.draft { border-color: #f59e0b; color: #f59e0b; }
  .print-btn { display: flex; justify-content: center; padding: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
  .print-btn button { background: #0f172a; color: #fff; border: none; padding: 10px 32px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; letter-spacing: .02em; }
  .print-btn button:hover { background: #1e293b; }
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; margin: 0; border-radius: 0; max-width: 100%; }
    .print-btn { display: none; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img src="${logoUrl}" alt="${BRAND.name}" onerror="this.style.display='none'" />
    <div class="header-right">
      <div class="title">SALARY SLIP</div>
      <div class="month">${fmtMonth(row.month)}</div>
    </div>
  </div>

  <div class="info">
    <div class="info-col">
      <div class="info-label">Employee</div>
      <div class="info-row"><span>Name</span><span>${row.name}</span></div>
      <div class="info-row"><span>Employee ID</span><span>${row.emp_id}</span></div>
      ${row.department ? `<div class="info-row"><span>Department</span><span>${row.department}</span></div>` : ""}
      ${row.designation ? `<div class="info-row"><span>Designation</span><span>${row.designation}</span></div>` : ""}
      ${row.joining_date ? `<div class="info-row"><span>Joining Date</span><span>${new Date(row.joining_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></div>` : ""}
    </div>
    <div class="info-col">
      <div class="info-label">Pay Period</div>
      <div class="info-row"><span>Month</span><span>${fmtMonth(row.month)}</span></div>
      <div class="info-row"><span>Working Days</span><span>${row.working_days}</span></div>
      <div class="info-row"><span>Generated</span><span>${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
      <div class="info-row"><span>Status</span><span style="font-weight:700;color:${isPaid ? "#16a34a" : "#f59e0b"}">${isPaid ? "PAID" : "DRAFT"}</span></div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-cell"><div class="sc-num">${row.present_days}</div><div class="sc-label">Present</div></div>
    <div class="summary-cell"><div class="sc-num">${row.leave_days}</div><div class="sc-label">Leave</div></div>
    <div class="summary-cell"><div class="sc-num">${row.absent_days}</div><div class="sc-label">Absent</div></div>
    <div class="summary-cell"><div class="sc-num">${row.late_count}</div><div class="sc-label">Lates</div></div>
  </div>

  <div class="earnings">
    <div class="earnings-title">Earnings &amp; Deductions</div>
    <table class="earn-table">
      <tbody>
        ${rows.map(([label, val, type]) => `
        <tr>
          <td class="${type ?? ""}">${label}</td>
          <td class="${type ?? ""}">${type === "minus" ? "−" : type === "plus" ? "+" : ""} ${val}</td>
        </tr>`).join("")}
        ${row.note ? `<tr><td colspan="2" style="color:#64748b;font-size:12px;padding-top:8px">Note: ${row.note}</td></tr>` : ""}
      </tbody>
    </table>
  </div>

  <div class="net-row">
    <div class="net-label">Net Salary (${fmtMonth(row.month)})</div>
    <div class="net-amount">${fmt(row.net_salary)}</div>
  </div>

  <div class="footer">
    <span>Generated by ${BRAND.name} HR System</span>
    <div class="stamp">
      <span class="stamp-text ${isPaid ? "" : "draft"}">${isPaid ? "PAID" : "DRAFT"}</span>
    </div>
  </div>

  <div class="print-btn">
    <button onclick="window.print()">Download / Print PDF</button>
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
