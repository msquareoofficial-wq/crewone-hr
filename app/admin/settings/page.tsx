// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { getSettings, getNavLabels, getFinUsdColors } from "@/lib/db";
import { getBrandLogos } from "@/lib/brand";
import Shell from "@/components/Shell";
import SettingsForm from "./SettingsForm";
import BrandingForm from "./BrandingForm";
import AdminPassword from "./AdminPassword";
import AdminPicture from "./AdminPicture";
import AdminName from "./AdminName";
import ResetData from "./ResetData";
import NavLabelsForm from "./NavLabelsForm";
import FinUsdColorForm from "./FinUsdColorForm";

export default async function SettingsPage() {
  const admin = await requireAdminPage();
  const s = await getSettings();
  const logos = await getBrandLogos();
  const navLabels = await getNavLabels();
  const usdColors = await getFinUsdColors();
  return (
    <Shell user={admin}>
      <h1>Settings</h1>
      <div className="card"><h2>Attendance rules</h2><SettingsForm s={s} /></div>
      <div className="card"><h2>Dollar tile gradient</h2><FinUsdColorForm c1={usdColors.c1} c2={usdColors.c2} /></div>
      <div className="card"><h2>Navigation tab names</h2><p className="mute" style={{ marginTop: 0 }}>Rename the navigation tabs to match your company&apos;s language. Leave blank to use the default name.</p><NavLabelsForm labels={navLabels} /></div>
      <div className="card"><h2>Company logo</h2><BrandingForm light={logos.light} dark={logos.dark} customLight={logos.customLight} customDark={logos.customDark} /></div>
      <div className="card"><h2>My name and designation</h2><AdminName name={admin.name} designation={admin.designation} /></div>
      <div className="card"><h2>My profile picture (DP)</h2><AdminPicture picture={admin.picture} /></div>
      <div className="card"><h2>Change my password</h2><AdminPassword /></div>
      <div className="card"><h2>Backup</h2><p className="mute" style={{ marginTop: 0 }}>Download all main data (users, attendance, leaves, payroll, projects, activity) as one JSON file. Passwords and uploaded files are not included.</p><a className="btn" href="/api/admin/backup">Download backup</a></div>
      <div className="card"><h2>Reset data</h2><ResetData /></div>
    </Shell>
  );
}
