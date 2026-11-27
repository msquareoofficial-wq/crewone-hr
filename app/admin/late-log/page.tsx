// Powered By Vistech Force
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Late Log" };
import { requireAdminPage } from "@/lib/auth";
import { q } from "@/lib/db";
import Shell from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";
import { fmtDate } from "@/lib/fmtdate";
import { fmt12 } from "@/lib/time";

async function getLateLog() {
  await q(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_reason TEXT`);
  return q<{
    work_date: string;
    name: string;
    emp_id: string;
    department: string | null;
    sign_in: string;
    late_minutes: number;
    late_reason: string | null;
  }>(`
    SELECT a.work_date, u.name, u.emp_id, u.department,
           a.sign_in, a.late_minutes, a.late_reason
    FROM attendance a
    JOIN users u ON u.id = a.user_id
    WHERE a.late = TRUE
    ORDER BY a.work_date DESC, a.sign_in DESC
    LIMIT 200
  `);
}

export default async function LateLogPage() {
  const admin = await requireAdminPage();
  const rows = await getLateLog();

  const withReason = rows.filter(r => r.late_reason);
  const withoutReason = rows.filter(r => !r.late_reason);

  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: "Late Log" }]} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 4px" }}>Late Log</h1>
          <p className="mute" style={{ margin: 0, fontSize: "0.83rem" }}>
            All late arrivals — last 200 records
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Total Late</div>
          <div style={{ fontSize: "1.9rem", fontWeight: 700, lineHeight: 1 }}>{rows.length}</div>
        </div>
        <div className="card" style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Reason Given</div>
          <div style={{ fontSize: "1.9rem", fontWeight: 700, color: "#16a34a", lineHeight: 1 }}>{withReason.length}</div>
        </div>
        <div className="card" style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>No Reason</div>
          <div style={{ fontSize: "1.9rem", fontWeight: 700, color: withoutReason.length > 0 ? "#dc2626" : "#16a34a", lineHeight: 1 }}>{withoutReason.length}</div>
        </div>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <p className="mute" style={{ textAlign: "center", padding: "32px 0" }}>No late arrivals recorded yet.</p>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Dept</th>
                  <th>Sign In</th>
                  <th>Late By</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.work_date)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      <div className="mute" style={{ fontSize: "0.78rem" }}>{r.emp_id}</div>
                    </td>
                    <td>{r.department ?? <span className="mute">—</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmt12(r.sign_in?.slice(11, 16) ?? "")}</td>
                    <td>
                      <span className="badge b-bad" style={{ fontSize: "0.78rem" }}>{r.late_minutes} min</span>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      {r.late_reason
                        ? <span style={{ fontSize: "0.88rem" }}>{r.late_reason}</span>
                        : <span className="badge b-mute" style={{ fontSize: "0.75rem" }}>No reason given</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
