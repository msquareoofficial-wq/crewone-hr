// Powered By Vistech Force — shared payslip HTML builder
import type { PayslipSettings, CustomField } from "./payslip-settings";
import { DEFAULT_FIELDS, isCountSource } from "./payslip-settings";

function fmt(n: number, currency: string) {
  const num = Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${num}` : num;
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function resolveValue(field: CustomField, row: Record<string, unknown>): number {
  if (field.source === "manual") return Number(field.value ?? 0);
  return Number(row[field.source] ?? 0);
}

export function buildPayslipHtml(
  row: Record<string, unknown>,
  ps: PayslipSettings,
  logoUrl: string,
  isPreview = false
): string {
  const { header_color, header_text_color, accent_color, address, currency: c, footer_note, show_signature } = ps;
  const htc = header_text_color || "#ffffff";
  const fields = ps.custom_fields?.length ? ps.custom_fields : DEFAULT_FIELDS;
  const isPaid = row.status === "paid";

  const rowsHtml = fields
    .map((field) => {
      const rawVal = resolveValue(field, row);
      const displayVal = isCountSource(field.source) ? String(rawVal) : fmt(rawVal, c);
      const cls = field.type === "deduction" ? "minus" : field.type === "earning" ? "plus" : "";
      const prefix = field.type === "deduction" ? "− " : "";
      return `<tr><td class="${cls}">${field.label}</td><td class="${cls}">${prefix}${displayVal}</td></tr>`;
    })
    .join("");

  const preview = isPreview
    ? `<div class="preview-banner">⚠ PREVIEW — Sample data only. Changes you just saved are reflected here.</div>`
    : "";

  const previewCss = isPreview
    ? `.preview-banner{background:#fef3c7;color:#92400e;padding:10px 24px;text-align:center;font-size:12px;font-weight:600;letter-spacing:.03em;border-bottom:1px solid #fde68a}`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Payslip — ${row.name} — ${fmtMonth(String(row.month))}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Arial,sans-serif;font-size:13px;color:#111;background:#f5f5f5}
  ${previewCss}
  .page{max-width:760px;margin:${isPreview ? "24px" : "32px"} auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.12)}
  .header{background:${header_color};color:${htc};padding:28px 36px 22px;display:flex;justify-content:space-between;align-items:flex-start}
  .header-left{display:flex;flex-direction:column;gap:6px}
  .header img{height:44px;object-fit:contain;max-width:220px}
  .header-address{font-size:11px;color:${htc};opacity:.7;line-height:1.4;max-width:260px}
  .header-right{text-align:right}.header-right .title{font-size:20px;font-weight:700;letter-spacing:.04em}
  .header-right .month{font-size:13px;color:${htc};opacity:.75;margin-top:2px}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid #e2e8f0}
  .info-col{padding:20px 36px}.info-col:first-child{border-right:1px solid #e2e8f0}
  .info-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:10px;font-weight:600}
  .info-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
  .info-row span:first-child{color:#475569}.info-row span:last-child{font-weight:500}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid #e2e8f0}
  .summary-cell{padding:14px 20px;text-align:center;border-right:1px solid #e2e8f0}.summary-cell:last-child{border-right:none}
  .summary-cell .sc-num{font-size:20px;font-weight:700;color:#0f172a}.summary-cell .sc-label{font-size:11px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:.04em}
  .earnings{padding:20px 36px 0}.earnings-title{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:600;margin-bottom:12px}
  .earn-table{width:100%;border-collapse:collapse}.earn-table td{padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
  .earn-table td:last-child{text-align:right;font-weight:500}.earn-table .minus{color:#dc2626}.earn-table .plus{color:#16a34a}
  .net-row{margin:20px 36px;background:${accent_color};color:#fff;border-radius:8px;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}
  .net-row .net-label{font-size:14px;font-weight:600}.net-row .net-amount{font-size:22px;font-weight:700;letter-spacing:.02em}
  .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:24px 36px 8px}
  .sig-box{border-top:1px solid #94a3b8;padding-top:6px;font-size:11px;color:#64748b;text-align:center}
  .footer{padding:16px 36px;display:flex;justify-content:space-between;align-items:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0}
  .footer-note{max-width:450px}
  .stamp-text{display:inline-block;border:3px solid #16a34a;color:#16a34a;font-size:15px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;padding:4px 14px;border-radius:4px;transform:rotate(-8deg);opacity:.85}
  .stamp-text.draft{border-color:#f59e0b;color:#f59e0b}
  .print-btn{display:flex;justify-content:center;padding:24px;background:#f8fafc;border-top:1px solid #e2e8f0}
  .print-btn button{background:${header_color};color:${htc};border:none;padding:10px 32px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.02em}
  @media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0;max-width:100%}.print-btn${isPreview ? ",.preview-banner" : ""}{display:none}}
</style>
</head>
<body>
${preview}
<div class="page">
  <div class="header">
    <div class="header-left">
      ${logoUrl ? `<img src="${logoUrl}" alt="" onerror="this.style.display='none'"/>` : ""}
      ${address ? `<div class="header-address">${address}</div>` : ""}
    </div>
    <div class="header-right"><div class="title">SALARY SLIP</div><div class="month">${fmtMonth(String(row.month))}</div></div>
  </div>
  <div class="info">
    <div class="info-col">
      <div class="info-label">Employee</div>
      <div class="info-row"><span>Name</span><span>${row.name}</span></div>
      <div class="info-row"><span>Employee ID</span><span>${row.emp_id}</span></div>
      ${row.department ? `<div class="info-row"><span>Department</span><span>${row.department}</span></div>` : ""}
      ${row.designation ? `<div class="info-row"><span>Designation</span><span>${row.designation}</span></div>` : ""}
      ${row.joining_date ? `<div class="info-row"><span>Joining Date</span><span>${new Date(String(row.joining_date)).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span></div>` : ""}
    </div>
    <div class="info-col">
      <div class="info-label">Pay Period</div>
      <div class="info-row"><span>Month</span><span>${fmtMonth(String(row.month))}</span></div>
      <div class="info-row"><span>Working Days</span><span>${row.working_days}</span></div>
      <div class="info-row"><span>Generated</span><span>${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span></div>
      <div class="info-row"><span>Status</span><span style="font-weight:700;color:${isPaid?"#16a34a":"#f59e0b"}">${isPaid?"PAID":"DRAFT"}</span></div>
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
    <table class="earn-table"><tbody>
      ${rowsHtml}
      ${row.note ? `<tr><td colspan="2" style="color:#64748b;font-size:12px;padding-top:8px">Note: ${row.note}</td></tr>` : ""}
    </tbody></table>
  </div>
  <div class="net-row">
    <div class="net-label">Net Salary (${fmtMonth(String(row.month))})</div>
    <div class="net-amount">${fmt(Number(row.net_salary), c)}</div>
  </div>
  ${show_signature ? `<div class="sig-row"><div class="sig-box">Employee Signature</div><div class="sig-box">Authorised Signatory</div></div>` : ""}
  <div class="footer">
    <span class="footer-note">${footer_note}</span>
    <div class="stamp"><span class="stamp-text${isPaid?"":" draft"}">${isPaid?"PAID":"DRAFT"}</span></div>
  </div>
  <div class="print-btn"><button onclick="window.print()">Download / Print PDF</button></div>
</div>
</body>
</html>`;
}
