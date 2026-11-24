// Powered By Vistech Force
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import { ACT_CATS } from "@/lib/activity";
import { fmtDateTime } from "@/lib/time";
import Shell from "@/components/Shell";
import { EmptyRow } from "@/components/EmptyState";
import Breadcrumbs from "@/components/Breadcrumbs";

const LABEL: Record<string, string> = { auth: "Login", attendance: "Attendance", break: "Break", task: "Task timer", leave: "Leave", project: "Projects", chat: "Chat", profile: "Profile" };
const BADGE: Record<string, string> = { auth: "b-ok", attendance: "b-ok", break: "b-warn", leave: "b-warn", chat: "", task: "", project: "", profile: "" };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ user?: string; cat?: string; day?: string; n?: string }> }) {
  const admin = await requireAdminPage();
  const s = await getSettings();
  const sp = await searchParams;
  const uid = Number(sp.user) || 0;
  const cat = (ACT_CATS as readonly string[]).includes(sp.cat || "") ? sp.cat! : "";
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : "";
  const n = Math.min(Math.max(Number(sp.n) || 100, 100), 1000);
  const users = await q<any>("SELECT id, name, emp_id FROM users ORDER BY name");
  const where: string[] = []; const p: any[] = [];
  if (uid) { p.push(uid); where.push(`a.user_id=$${p.length}`); }
  if (cat) { p.push(cat); where.push(`a.category=$${p.length}`); }
  if (day) { p.push(day); p.push(s.timezone); where.push(`(a.created_at AT TIME ZONE $${p.length})::date = $${p.length - 1}::date`); }
  p.push(n + 1);
  const rows = await q<any>(
    `SELECT a.*, u.name, u.emp_id, u.role FROM activity_log a LEFT JOIN users u ON u.id=a.user_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY a.created_at DESC, a.id DESC LIMIT $${p.length}`, p);
  const more = rows.length > n;
  const list = rows.slice(0, n);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...(uid ? { user: String(uid) } : {}), ...(cat ? { cat } : {}), ...(day ? { day } : {}), ...extra }).toString();
  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: "Activity log" }]} />
      <h1>User activity log</h1>
      <div className="card">
        <form method="get" className="row" style={{ marginBottom: 12 }}>
          <select name="user" defaultValue={uid || ""} style={{ width: 200 }}><option value="">All users</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.emp_id})</option>)}</select>
          <select name="cat" defaultValue={cat} style={{ width: 160 }}><option value="">All activities</option>{ACT_CATS.map((c) => <option key={c} value={c}>{LABEL[c]}</option>)}</select>
          <input type="date" name="day" defaultValue={day} style={{ width: 160 }} />
          <button className="btn sm">Filter</button>
          <Link className="btn sec sm" href="/admin/activity">Reset</Link>
        </form>
        <div className="scroll"><table>
          <thead><tr><th>Time</th><th>User</th><th>Type</th><th>Activity</th><th>Details</th><th>IP</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(a.created_at, s.timezone)}</td>
                <td>{a.name ? <Link href={`/admin/activity?${qs({ user: String(a.user_id) })}`}>{a.name}</Link> : <span className="mute">-</span>} <span className="mute">{a.emp_id}</span></td>
                <td><span className={`badge ${BADGE[a.category] ?? ""}`}>{LABEL[a.category] ?? a.category}</span></td>
                <td>{a.action}</td>
                <td className="mute">{a.detail ?? "-"}</td>
                <td className="mute">{a.ip ?? "-"}</td>
              </tr>
            ))}
            {!list.length && <EmptyRow icon="activity" title="No activity yet" sub="User actions will appear here as the team works." cols={6} />}
          </tbody>
        </table></div>
        {more && <div style={{ marginTop: 12 }}><Link className="btn sec sm" href={`/admin/activity?${qs({ n: String(n + 100) })}`}>Load more</Link></div>}
      </div>
    </Shell>
  );
}
