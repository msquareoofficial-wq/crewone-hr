// Powered By Vistech Force
import { DeleteBtn } from "@/components/FeedClient";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";

export default function MyLeaves({ leaves }: { leaves: any[] }) {
  if (!leaves.length) return <p className="mute">No leave requests yet.</p>;
  const badge = (s: string) => <span className={`badge ${s === "approved" ? "b-ok" : s === "rejected" ? "b-bad" : "b-warn"}`}>{s}</span>;
  return (
    <div className="scroll"><table>
      <thead><tr><th>Dates</th><th>Reason</th><th>Status</th><th>Admin note</th><th></th></tr></thead>
      <tbody>{leaves.map((l) => (
        <tr key={l.id}>
          <td>{l.start_date === l.end_date ? fmtDate(l.start_date) : `${fmtDate(l.start_date)} to ${fmtDate(l.end_date)}`}</td>
          <td>{l.reason}</td><td>{badge(l.status)}</td><td>{l.admin_note ?? "-"}</td>
          <td>{l.status === "pending" && <DeleteBtn url={`/api/leaves/${l.id}`} label="Cancel" confirmText="Cancel this request?" />}</td>
        </tr>))}
      </tbody></table></div>
  );
}
