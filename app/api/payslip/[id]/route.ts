// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { getBrandLogos } from "@/lib/brand";
import { DEFAULT_FIELDS } from "@/lib/payslip-settings";
import type { PayslipSettings, CustomField } from "@/lib/payslip-settings";
import { buildPayslipHtml } from "@/lib/payslip-html";

async function getPayslipSettings(): Promise<PayslipSettings> {
  const rows = await q<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key LIKE 'payslip_%'"
  );
  const m = Object.fromEntries(rows.map((r) => [r.key.slice(8), r.value]));
  let custom_fields: CustomField[] = DEFAULT_FIELDS;
  if (m.fields) {
    try { custom_fields = JSON.parse(m.fields); } catch {}
  }
  return {
    header_color: m.header_color || "#0f172a",
    header_text_color: m.header_text_color || "#ffffff",
    accent_color: m.accent_color || "#0f172a",
    address: m.address ?? "",
    currency: m.currency ?? "",
    footer_note: m.footer_note ?? "This is a system generated payslip.",
    show_signature: m.show_signature === "true",
    logo: m.logo ?? "",
    custom_fields,
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || me.role !== "admin") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const row = await q1<Record<string, unknown>>(
    `SELECT p.*, u.name, u.emp_id, u.department, u.designation, u.joining_date
     FROM payroll p JOIN users u ON u.id=p.user_id WHERE p.id=$1`,
    [id]
  );
  if (!row) return new NextResponse("Not found", { status: 404 });

  const [ps, logos] = await Promise.all([getPayslipSettings(), getBrandLogos()]);
  const logoUrl = ps.logo || logos.dark;

  return new NextResponse(buildPayslipHtml(row, ps, logoUrl), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
