// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import Shell from "@/components/Shell";
import { DeleteBtn } from "@/components/FeedClient";
import LeaveDecision from "./LeaveDecision";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";

export default async function LeavesPage() {
  const admin = await requireAdminPage("leaves");
  const quota = (await getSettings()).leave_quota;
  const rows = await q<any>(
    `SELECT l.*, u.name, u.emp_id, u.department,
       (SELECT COALESCE(SUM(a.end_date::date - a.start_date::date + 1),0)::int FROM leave_requests a WHERE a.user_id=l.user_id AND a.status='approved' AND LEFT(a.start_date,4)=to_char(now(),'YYYY')) AS used FROM leave_requests l JOIN users u ON u.id=l.user_id
     ORDER BY (l.status='pending') DESC, l.start_date DESC LIMIT 200`);
  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");
  const dates = (l: any) => (l.start_date === l.end_date ? fmtDate(l.start_date) : `${fmtDate(l.start_date)} to ${fmtDate(l.end_date)}`);
  return (
    <Shell user={admin}>
      <h1>Leave requests</h1>
      <div className="card">
        <h2>Pending ({pending.length})</h2>
        {pending.length ? (
          <div className="scroll"><table>
            <thead><tr><th>User</th><th>Dept</th><th>Balance</th><th>Dates</th><th>Reason</th><th>Decision</th></tr></thead>
            <tbody>{pending.map((l) => (<tr key={l.id}><td>{l.name} <span className="mute">{l.emp_id}</span></td><td>{l.department ?? "-"}</td><td>{Math.max(0, quota - l.used)} of {quota} left</td><td>{dates(l)}</td><td>{l.reason}</td><td><LeaveDecision id={l.id} /></td></tr>))}</tbody>
          </table></div>
        ) : <p className="mute">No pending requests.</p>}
      </div>
      <div className="card">
        <h2>History</h2>
        <div className="scroll"><table>
          <thead><tr><th>User</th><th>Dates</th><th>Reason</th><th>Status</th><th>Note</th><th></th></tr></thead>
          <tbody>{done.map((l) => (
            <tr key={l.id}>
              <td>{l.name}</td><td>{dates(l)}</td><td>{l.reason}</td>
              <td><span className={`badge ${l.status === "approved" ? "b-ok" : "b-bad"}`}>{l.status}</span></td>
              <td>{l.admin_note ?? "-"}</td>
              <td><div className="row"><LeaveDecision id={l.id} change /><DeleteBtn url={`/api/leaves/${l.id}`} confirmText="Delete this record?" /></div></td>
            </tr>))}
            {!done.length && <tr><td colSpan={6} className="mute">No records yet.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </Shell>
  );
}
