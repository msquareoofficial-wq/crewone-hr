// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import Shell from "@/components/Shell";
import { DeleteBtn } from "@/components/FeedClient";
import LeaveDecision from "./LeaveDecision";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";

export default async function LeavesPage() {
  const admin = await requireAdminPage("leaves");
  const s = await getSettings();
  const quota = s.leave_quota;
  const year = new Date().getFullYear().toString();
  const rows = await q<any>(
    `SELECT l.*, u.name, u.emp_id, u.department,
       (SELECT COALESCE(SUM(a.end_date::date - a.start_date::date + 1),0)::int FROM leave_requests a WHERE a.user_id=l.user_id AND a.status='approved' AND LEFT(a.start_date,4)=to_char(now(),'YYYY')) AS used FROM leave_requests l JOIN users u ON u.id=l.user_id
     ORDER BY (l.status='pending') DESC, l.start_date DESC LIMIT 200`);
  // All users balance overview
  const allUsers = await q<any>(
    `SELECT u.id, u.name, u.emp_id, u.department, u.leave_quota,
       COALESCE((SELECT SUM(r.end_date::date - r.start_date::date + 1)::int FROM leave_requests r WHERE r.user_id=u.id AND r.status='approved' AND LEFT(r.start_date,4)=$1),0) AS used
     FROM users u WHERE u.role='user' ORDER BY u.name`,
    [year]
  );
  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");
  const dates = (l: any) => (l.start_date === l.end_date ? fmtDate(l.start_date) : `${fmtDate(l.start_date)} to ${fmtDate(l.end_date)}`);
  return (
    <Shell user={admin}>
      <h1>Leave requests</h1>

      <div className="card">
        <h2>All Users Leave Balance — {year}</h2>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>Employee</th><th>Dept</th><th>Quota</th><th>Used</th><th>Remaining</th><th>Status</th></tr>
            </thead>
            <tbody>
              {allUsers.map((u: any) => {
                const eff = u.leave_quota ?? quota;
                const left = Math.max(0, eff - u.used);
                const pct = eff > 0 ? Math.round((u.used / eff) * 100) : 0;
                const statusCls = left === 0 ? "b-bad" : left <= Math.ceil(eff * 0.2) ? "b-warn" : "b-ok";
                const statusTxt = left === 0 ? "Exhausted" : left <= Math.ceil(eff * 0.2) ? "Low" : "Good";
                return (
                  <tr key={u.id}>
                    <td>{u.name} <span className="mute">{u.emp_id}</span></td>
                    <td>{u.department ?? "-"}</td>
                    <td>{eff}{u.leave_quota != null ? <span className="mute" title="Custom quota"> *</span> : ""}</td>
                    <td>{u.used}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 60, height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: left === 0 ? "var(--bad)" : left <= Math.ceil(eff * 0.2) ? "#f59e0b" : "var(--ok)", transition: "width .4s" }} />
                        </div>
                        <span style={{ minWidth: 20 }}>{left}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${statusCls}`}>{statusTxt}</span></td>
                  </tr>
                );
              })}
              {!allUsers.length && <tr><td colSpan={6} className="mute">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mute" style={{ marginTop: 8, fontSize: 13 }}>* = custom quota set for this user</p>
      </div>

      <div className="card">
        <h2>Pending ({pending.length})</h2>
        {pending.length ? (
          <div className="scroll"><table>
            <thead><tr><th>User</th><th>Dept</th><th>Balance</th><th>Dates</th><th>Reason</th><th>Decision</th></tr></thead>
            <tbody>{pending.map((l) => {
              const effQ = (allUsers.find((u: any) => u.id === l.user_id)?.leave_quota) ?? quota;
              return (<tr key={l.id}><td>{l.name} <span className="mute">{l.emp_id}</span></td><td>{l.department ?? "-"}</td><td>{Math.max(0, effQ - l.used)} of {effQ} left</td><td>{dates(l)}</td><td>{l.reason}</td><td><LeaveDecision id={l.id} /></td></tr>);
            })}</tbody>
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
