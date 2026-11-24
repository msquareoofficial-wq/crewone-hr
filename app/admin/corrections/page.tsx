// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import { fmt12 } from "@/lib/time";
import { fmtDate } from "@/lib/fmtdate";
import Shell from "@/components/Shell";
import Decide from "./Decide";
import { EmptyRow } from "@/components/EmptyState";
import Breadcrumbs from "@/components/Breadcrumbs";

export default async function CorrectionsPage() {
  const admin = await requireAdminPage();
  await getSettings();
  const rows = await q<any>(
    `SELECT c.*, u.name, u.emp_id FROM attendance_corrections c JOIN users u ON u.id=c.user_id
     ORDER BY (c.status='pending') DESC, c.created_at DESC LIMIT 200`);
  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");
  const times = (c: any) => [c.req_in && `IN ${fmt12(c.req_in)}`, c.req_out && `OUT ${fmt12(c.req_out)}`].filter(Boolean).join(", ");
  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: "Corrections" }]} />
      <h1>Attendance corrections</h1>
      <div className="card">
        <h2>Pending ({pending.length})</h2>
        {pending.length ? (
          <div className="scroll"><table>
            <thead><tr><th>User</th><th>Date</th><th>Requested</th><th>Reason</th><th>Decision</th></tr></thead>
            <tbody>{pending.map((c) => (<tr key={c.id}><td>{c.name} <span className="mute">{c.emp_id}</span></td><td>{fmtDate(c.work_date)}</td><td>{times(c)}</td><td>{c.reason}</td><td><Decide id={c.id} /></td></tr>))}</tbody>
          </table></div>
        ) : <EmptyRow icon="corrections" title="No pending requests" sub="Correction requests from employees will appear here." cols={5} />}
      </div>
      <div className="card">
        <h2>History</h2>
        <div className="scroll"><table>
          <thead><tr><th>User</th><th>Date</th><th>Requested</th><th>Reason</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>{done.map((c) => (
            <tr key={c.id}><td>{c.name}</td><td>{fmtDate(c.work_date)}</td><td>{times(c)}</td><td>{c.reason}</td>
              <td><span className={`badge ${c.status === "approved" ? "b-ok" : "b-bad"}`}>{c.status}</span></td><td>{c.admin_note ?? "-"}</td></tr>))}
            {!done.length && <EmptyRow icon="corrections" title="No history yet" cols={6} />}
          </tbody>
        </table></div>
      </div>
    </Shell>
  );
}
