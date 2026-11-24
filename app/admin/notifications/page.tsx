// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import { getNotifications } from "@/lib/hr";
import Shell from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";
import Feed from "@/components/Feed";
import { DeleteBtn } from "@/components/FeedClient";
import ComposeForm from "./ComposeForm";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";

export default async function NotificationsPage() {
  const admin = await requireAdminPage("notifications");
  const s = await getSettings();
  const items = await getNotifications({ role: "admin", department: null }, 100);
  const hols = await q<any>("SELECT id, holiday_date, title FROM holidays ORDER BY holiday_date DESC LIMIT 60");
  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: "Notifications" }]} />
      <h1>Notifications</h1>
      <div className="card"><h2>New notification / holiday</h2><ComposeForm /></div>
      <div className="grid g2">
        <div className="card"><h2>Sent notifications</h2><Feed items={items} tz={s.timezone} admin meId={admin.id} /></div>
        <div className="card">
          <h2>Holidays (off days in calendar)</h2>
          {hols.length ? (
            <div className="scroll"><table><thead><tr><th>Date</th><th>Title</th><th></th></tr></thead><tbody>
              {hols.map((h) => (<tr key={h.id}><td>{fmtDate(h.holiday_date)}</td><td>{h.title}</td><td><DeleteBtn url={`/api/holidays/${h.id}`} confirmText="Remove this holiday?" /></td></tr>))}
            </tbody></table></div>
          ) : <p className="mute">No holidays.</p>}
        </div>
      </div>
    </Shell>
  );
}
