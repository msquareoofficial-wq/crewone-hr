// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { q } from "@/lib/db";
import Shell from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";
import PolicyForm from "@/app/admin/settings/PolicyForm";
import Link from "next/link";

async function getPolicyData() {
  try {
    const [points, acks, totalUsers] = await Promise.all([
      q<{ id: number; title: string; body: string; sort_order: number }>(
        "SELECT id, title, body, sort_order FROM policy_points ORDER BY sort_order ASC, id ASC"
      ),
      q<{ user_id: number; name: string; emp_id: string; acked_at: string }>(
        `SELECT pa.user_id, u.name, u.emp_id, pa.acked_at
         FROM policy_acks pa JOIN users u ON u.id=pa.user_id
         WHERE u.active=TRUE ORDER BY pa.acked_at DESC`
      ),
      q<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE role='user' AND active=TRUE"),
    ]);
    return { points, acks, totalUsers: Number(totalUsers[0]?.count ?? 0) };
  } catch {
    return { points: [], acks: [], totalUsers: 0 };
  }
}

async function getLastUpdated(): Promise<string | null> {
  try {
    const rows = await q<{ value: string }>("SELECT value FROM settings WHERE key='policy_last_updated'");
    return rows[0]?.value ?? null;
  } catch { return null; }
}

export default async function AdminPolicyPage() {
  const admin = await requireAdminPage();
  const [{ points, acks, totalUsers }, lastUpdated] = await Promise.all([
    getPolicyData(),
    getLastUpdated(),
  ]);

  const ackedSet = new Set(acks.map(a => a.user_id));
  const pendingCount = totalUsers - ackedSet.size;

  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { href: "/admin/settings", label: "Settings" }, { label: "Company Policy" }]} />
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Company Policy</h1>
        <Link href="/policy" className="btn sec sm" style={{ fontSize: "0.82rem" }}>Preview as employee →</Link>
      </div>
      {lastUpdated && (
        <p className="mute" style={{ marginTop: 0, marginBottom: 20, fontSize: "0.85rem" }}>
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Acknowledged</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#16a34a" }}>{ackedSet.size}<span style={{ fontSize: "1rem", color: "var(--mute)", fontWeight: 400 }}>/{totalUsers}</span></div>
        </div>
        <div className="card" style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Pending</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: pendingCount > 0 ? "#dc2626" : "#16a34a" }}>{pendingCount}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Policy Points</h2>
        <p className="mute" style={{ marginTop: 0, marginBottom: 16, fontSize: "0.85rem" }}>
          Adding or editing a point resets all acknowledgments and notifies employees.
          Use <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>**text**</code> for bold,{" "}
          <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>- item</code> for bullets.
        </p>
        <PolicyForm initial={points} />
      </div>

      {acks.length > 0 && (
        <div className="card">
          <h2>Acknowledged by</h2>
          <div className="scroll">
            <table>
              <thead><tr><th>Employee</th><th>ID</th><th>Acknowledged at</th></tr></thead>
              <tbody>
                {acks.map(a => (
                  <tr key={a.user_id}>
                    <td>{a.name}</td>
                    <td>{a.emp_id}</td>
                    <td style={{ color: "var(--mute)", fontSize: "0.85rem" }}>{new Date(a.acked_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
