// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { PAYSLIP_DEFAULTS, DEFAULT_FIELDS } from "@/lib/payslip-settings";
import type { PayslipSettings, CustomField } from "@/lib/payslip-settings";

export async function GET() {
  const rows = await q<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key LIKE 'payslip_%'"
  );
  const m = Object.fromEntries(rows.map((r) => [r.key.slice(8), r.value]));

  let custom_fields: CustomField[] = DEFAULT_FIELDS;
  if (m.fields) {
    try { custom_fields = JSON.parse(m.fields); } catch {}
  }

  return NextResponse.json({
    header_color: m.header_color || PAYSLIP_DEFAULTS.header_color,
    header_text_color: m.header_text_color || PAYSLIP_DEFAULTS.header_text_color,
    accent_color: m.accent_color || PAYSLIP_DEFAULTS.accent_color,
    address: m.address ?? "",
    currency: m.currency ?? "",
    footer_note: m.footer_note ?? PAYSLIP_DEFAULTS.footer_note,
    show_signature: m.show_signature === "true",
    logo: m.logo ?? "",
    custom_fields,
  } satisfies PayslipSettings);
}

export async function PUT(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();

  const fields: Record<string, string> = {
    payslip_header_color: String(b.header_color || PAYSLIP_DEFAULTS.header_color),
    payslip_header_text_color: String(b.header_text_color || PAYSLIP_DEFAULTS.header_text_color),
    payslip_accent_color: String(b.accent_color || PAYSLIP_DEFAULTS.accent_color),
    payslip_address: String(b.address ?? ""),
    payslip_currency: String(b.currency ?? ""),
    payslip_footer_note: String(b.footer_note ?? ""),
    payslip_show_signature: b.show_signature ? "true" : "false",
    payslip_logo: String(b.logo ?? ""),
    payslip_fields: JSON.stringify(Array.isArray(b.custom_fields) ? b.custom_fields : DEFAULT_FIELDS),
  };

  for (const [k, v] of Object.entries(fields))
    await q("INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [k, v]);

  return NextResponse.json({ ok: true });
}
