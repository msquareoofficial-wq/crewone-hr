// Powered By Vistech Force — preview with dummy data
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { getBrandLogos } from "@/lib/brand";
import { DEFAULT_FIELDS } from "@/lib/payslip-settings";
import type { PayslipSettings, CustomField } from "@/lib/payslip-settings";
import { buildPayslipHtml } from "@/lib/payslip-html";

async function getPayslipSettings(): Promise<PayslipSettings> {
  const rows = await q<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key LIKE 'payslip_%'");
  const m = Object.fromEntries(rows.map((r) => [r.key.slice(8), r.value]));
  let custom_fields: CustomField[] = DEFAULT_FIELDS;
  if (m.fields) {
    try { custom_fields = JSON.parse(m.fields); } catch {}
  }
  return {
    header_color: m.header_color || "#0f172a",
    accent_color: m.accent_color || "#0f172a",
    address: m.address ?? "",
    currency: m.currency ?? "",
    footer_note: m.footer_note ?? "This is a system generated payslip.",
    show_signature: m.show_signature === "true",
    logo: m.logo ?? "",
    custom_fields,
  };
}

export async function GET() {
  const me = await getSession();
  if (!me || me.role !== "admin") return new NextResponse("Unauthorized", { status: 401 });

  const dummy: Record<string, unknown> = {
    name: "Sample Employee", emp_id: "EMP-001", department: "Engineering",
    designation: "Software Developer", joining_date: "2023-01-15",
    month: new Date().toISOString().slice(0, 7),
    working_days: 26, present_days: 24, leave_days: 1, absent_days: 1, late_count: 2,
    base_salary: 85000, bonus: 5000, absent_deduction: 3269, late_deduction: 1090,
    other_deduction: 0, net_salary: 85641, status: "paid", note: "",
  };

  const [ps, logos] = await Promise.all([getPayslipSettings(), getBrandLogos()]);
  const logoUrl = ps.logo || logos.dark;

  return new NextResponse(buildPayslipHtml(dummy, ps, logoUrl, true), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
