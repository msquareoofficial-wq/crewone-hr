// Powered By Vistech Force — preview with dummy data
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { BRAND, getBrandLogos } from "@/lib/brand";
import type { PayslipSettings } from "@/lib/payslip-settings";

function fmt(n: number, currency: string) {
  const num = Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${num}` : num;
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

async function getPayslipSettings(): Promise<PayslipSettings> {
  const rows = await q<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key LIKE 'payslip_%'");
  const m = Object.fromEntries(rows.map((r) => [r.key.slice(8), r.value]));
  return {
    header_color: m.header_color || "#0f172a",
    accent_color: m.accent_color || "#0f172a",
    address: m.address ?? "",
    currency: m.currency ?? "",
    footer_note: m.footer_note ?? "This is a system generated payslip.",
    show_signature: m.show_signature === "true",
  };
}

export async function GET() {
  const me = await getSession();
  if (!me || me.role !== "admin") return new NextResponse("Unauthorized", { status: 401 });

  const dummy = {
    name: "Sample Employee", emp_id: "EMP-001", department: "Engineering",
    designation: "Software Developer", joining_date: "2023-01-15",
    month: new Date().toISOString().slice(0, 7),
    working_days: 26, present_days: 24, leave_days: 1, absent_days: 1, late_count: 2,
    base_salary: 85000, bonus: 5000, absent_deduction: 3269, late_deduction: 1090,
    other_deduction: 0, net_salary: 85641, status: "paid", note: "",
  };

  const [ps, logos] = await Promise.all([getPayslipSettings(), getBrandLogos()]);
  const { header_color, accent_color, address, currency: c, footer_note, show_signature } = ps;

  const earningsRows: [string, string, string?][] = [
    ["Basic Salary", fmt(dummy.base_salary, c)],
    ["+ Bonus", fmt(dummy.bonus, c), "plus"],
    ["− Absent Deduction", fmt(dummy.absent_deduction, c), "minus"],
    ["− Late Deduction", fmt(dummy.late_deduction, c), "minus"],
    ["− Other Deduction", fmt(dummy.other_deduction, c), "minus"],
  ];

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Payslip Preview</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Arial,sans-serif;font-size:13px;color:#111;background:#f5f5f5}
  .preview-banner{background:#fef3c7;color:#92400e;padding:10px 24px;text-align:center;font-size:12px;font-weight:600;letter-spacing:.03em;border-bottom:1px solid #fde68a}
  .page{max-width:760px;margin:24px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.12)}
  .header{background:${header_color};color:#fff;padding:28px 36px 22px;display:flex;justify-content:space-between;align-items:flex-start}
  .header-left{display:flex;flex-direction:column;gap:6px}
  .header img{height:44px;object-fit:contain}
  .header-address{font-size:11px;color:rgba(255,255,255,.65);line-height:1.4;max-width:260px}
  .header-right{text-align:right}.header-right .title{font-size:20px;font-weight:700;letter-spacing:.04em}
  .header-right .month{font-size:13px;color:rgba(255,255,255,.65);margin-top:2px}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid #e2e8f0}
  .info-col{padding:20px 36px}.info-col:first-child{border-right:1px solid #e2e8f0}
  .info-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:10px;font-weight:600}
  .info-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
  .info-row span:first-child{color:#475569}.info-row span:last-child{font-weight:500}
  .earnings{padding:20px 36px 0}.earnings-title{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:600;margin-bottom:12px}
  .earn-table{width:100%;border-collapse:collapse}.earn-table td{padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
  .earn-table td:last-child{text-align:right;font-weight:500}.earn-table .minus{color:#dc2626}.earn-table .plus{color:#16a34a}
  .net-row{margin:20px 36px;background:${accent_color};color:#fff;border-radius:8px;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}
  .net-row .net-label{font-size:14px;font-weight:600}.net-row .net-amount{font-size:22px;font-weight:700;letter-spacing:.02em}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-top:20px}
  .summary-cell{padding:14px 20px;text-align:center;border-right:1px solid #e2e8f0}.summary-cell:last-child{border-right:none}
  .summary-cell .sc-num{font-size:20px;font-weight:700;color:#0f172a}.summary-cell .sc-label{font-size:11px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:.04em}
  .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:24px 36px 8px}
  .sig-box{border-top:1px solid #94a3b8;padding-top:6px;font-size:11px;color:#64748b;text-align:center}
  .footer{padding:16px 36px;display:flex;justify-content:space-between;align-items:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0}
  .footer-note{max-width:450px}
  .stamp-text{display:inline-block;border:3px solid #16a34a;color:#16a34a;font-size:15px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;padding:4px 14px;border-radius:4px;transform:rotate(-8deg);opacity:.85}
  .print-btn{display:flex;justify-content:center;padding:24px;background:#f8fafc;border-top:1px solid #e2e8f0}
  .print-btn button{background:${header_color};color:#fff;border:none;padding:10px 32px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer}
  @media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0;max-width:100%}.print-btn,.preview-banner{display:none}}
</style></head><body>
<div class="preview-banner">⚠ PREVIEW — Sample data only. Changes you just saved are reflected here.</div>
<div class="page">
  <div class="header">
    <div class="header-left">
      <img src="${logos.dark}" alt="${BRAND.name}" onerror="this.style.display='none'"/>
      ${address ? `<div class="header-address">${address}</div>` : ""}
    </div>
    <div class="header-right"><div class="title">SALARY SLIP</div><div class="month">${fmtMonth(dummy.month)}</div></div>
  </div>
  <div class="info">
    <div class="info-col">
      <div class="info-label">Employee</div>
      <div class="info-row"><span>Name</span><span>${dummy.name}</span></div>
      <div class="info-row"><span>Employee ID</span><span>${dummy.emp_id}</span></div>
      <div class="info-row"><span>Department</span><span>${dummy.department}</span></div>
      <div class="info-row"><span>Designation</span><span>${dummy.designation}</span></div>
      <div class="info-row"><span>Joining Date</span><span>15 Jan 2023</span></div>
    </div>
    <div class="info-col">
      <div class="info-label">Pay Period</div>
      <div class="info-row"><span>Month</span><span>${fmtMonth(dummy.month)}</span></div>
      <div class="info-row"><span>Working Days</span><span>${dummy.working_days}</span></div>
      <div class="info-row"><span>Generated</span><span>${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span></div>
      <div class="info-row"><span>Status</span><span style="font-weight:700;color:#16a34a">PAID</span></div>
    </div>
  </div>
  <div class="summary">
    <div class="summary-cell"><div class="sc-num">${dummy.present_days}</div><div class="sc-label">Present</div></div>
    <div class="summary-cell"><div class="sc-num">${dummy.leave_days}</div><div class="sc-label">Leave</div></div>
    <div class="summary-cell"><div class="sc-num">${dummy.absent_days}</div><div class="sc-label">Absent</div></div>
    <div class="summary-cell"><div class="sc-num">${dummy.late_count}</div><div class="sc-label">Lates</div></div>
  </div>
  <div class="earnings">
    <div class="earnings-title">Earnings &amp; Deductions</div>
    <table class="earn-table"><tbody>
      ${earningsRows.map(([label,val,type])=>`<tr><td class="${type??""}">${label}</td><td class="${type??""}">${type==="minus"?"−":type==="plus"?"+":""} ${val}</td></tr>`).join("")}
    </tbody></table>
  </div>
  <div class="net-row">
    <div class="net-label">Net Salary (${fmtMonth(dummy.month)})</div>
    <div class="net-amount">${fmt(dummy.net_salary, c)}</div>
  </div>
  ${show_signature ? `<div class="sig-row"><div class="sig-box">Employee Signature</div><div class="sig-box">Authorised Signatory</div></div>` : ""}
  <div class="footer">
    <span class="footer-note">${footer_note}</span>
    <div class="stamp"><span class="stamp-text">PAID</span></div>
  </div>
  <div class="print-btn"><button onclick="window.print()">Download / Print PDF</button></div>
</div>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
