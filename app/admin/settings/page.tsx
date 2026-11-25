// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { getSettings, getNavLabels, getFinUsdColors, q } from "@/lib/db";
import { getBrandLogos } from "@/lib/brand";
import Shell from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";
import SettingsForm from "./SettingsForm";
import BrandingForm from "./BrandingForm";
import AdminPassword from "./AdminPassword";
import AdminPicture from "./AdminPicture";
import AdminName from "./AdminName";
import ResetData from "./ResetData";
import NavLabelsForm from "./NavLabelsForm";
import FinUsdColorForm from "./FinUsdColorForm";
import PayslipSettingsForm from "./PayslipSettingsForm";
import type { PayslipSettings, CustomField } from "@/lib/payslip-settings";
import { DEFAULT_FIELDS } from "@/lib/payslip-settings";
import Link from "next/link";

async function getPayslipSettingsFromDB(): Promise<PayslipSettings> {
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

export default async function SettingsPage() {
  const admin = await requireAdminPage();
  const [s, logos, navLabels, usdColors, payslipSettings] = await Promise.all([
    getSettings(),
    getBrandLogos(),
    getNavLabels(),
    getFinUsdColors(),
    getPayslipSettingsFromDB(),
  ]);
  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: "Settings" }]} />
      <h1>Settings</h1>
      <div className="card"><h2>Attendance rules</h2><SettingsForm s={s} /></div>
      <div className="card"><h2>Dollar Expenses card color</h2><p className="mute" style={{ marginTop: 0 }}>Customize the gradient of the Dollar Expenses card on the Finance page.</p><FinUsdColorForm c1={usdColors.c1} c2={usdColors.c2} /></div>
      <div className="card"><h2>Navigation tab names</h2><p className="mute" style={{ marginTop: 0 }}>Rename the navigation tabs to match your company&apos;s language. Leave blank to use the default name.</p><NavLabelsForm labels={navLabels} /></div>
      <div className="card"><h2>Company logo</h2><BrandingForm light={logos.light} dark={logos.dark} customLight={logos.customLight} customDark={logos.customDark} /></div>
      <div className="card">
        <h2>Payslip template</h2>
        <p className="mute" style={{ marginTop: 0, marginBottom: 16 }}>Customise the look and content of employee payslips.</p>
        <PayslipSettingsForm initial={payslipSettings} />
      </div>
      <div className="card"><h2>My name and designation</h2><AdminName name={admin.name} designation={admin.designation} /></div>
      <div className="card"><h2>My profile picture (DP)</h2><AdminPicture picture={admin.picture} /></div>
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>Company Policy</h2>
          <p className="mute" style={{ margin: 0 }}>Manage policy points, track employee acknowledgments.</p>
        </div>
        <Link href="/admin/policy" className="btn" style={{ flexShrink: 0 }}>Manage Policy →</Link>
      </div>
      <div className="card"><h2>Change my password</h2><AdminPassword /></div>
      <div className="card"><h2>Backup</h2><p className="mute" style={{ marginTop: 0 }}>Download all main data (users, attendance, leaves, payroll, projects, activity) as one JSON file. Passwords and uploaded files are not included.</p><a className="btn" href="/api/admin/backup">Download backup</a></div>
      <div className="card"><h2>Reset data</h2><ResetData /></div>
    </Shell>
  );
}
