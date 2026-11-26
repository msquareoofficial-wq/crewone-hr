// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { q } from "@/lib/db";
import Shell from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";
import PolicyForm from "@/app/admin/settings/PolicyForm";
import Link from "next/link";

async function ensureTables() {
  await q(`
    CREATE TABLE IF NOT EXISTS policy_points (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS policy_acks (
      user_id INT PRIMARY KEY,
      acked_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getPolicyData() {
  await ensureTables();
  const [points, acks, totalUsers, lastUpdated] = await Promise.all([
    q<{ id: number; title: string; body: string; sort_order: number }>(
      "SELECT id, title, body, sort_order FROM policy_points ORDER BY sort_order ASC, id ASC"
    ),
    q<{ user_id: number; name: string; emp_id: string; acked_at: string }>(
      `SELECT pa.user_id, u.name, u.emp_id, pa.acked_at
       FROM policy_acks pa JOIN users u ON u.id=pa.user_id
       WHERE u.active=TRUE ORDER BY pa.acked_at DESC`
    ),
    q<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE role='user' AND active=TRUE"),
    q<{ value: string }>("SELECT value FROM settings WHERE key='policy_last_updated'"),
  ]);
  return {
    points,
    acks,
    totalUsers: Number(totalUsers[0]?.count ?? 0),
    lastUpdated: lastUpdated[0]?.value ?? null,
  };
}

export default async function AdminPolicyPage() {
  const admin = await requireAdminPage();
  const { points, acks, totalUsers, lastUpdated } = await getPolicyData();
  const ackedCount = acks.length;
  const pendingCount = totalUsers - ackedCount;

  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { href: "/admin/settings", label: "Settings" }, { label: "Company Policy" }]} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: "0 0 4px" }}>Company Policy</h1>
          {lastUpdated && (
            <p className="mute" style={{ margin: 0, fontSize: "0.83rem" }}>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <Link href="/policy" className="btn sec sm">Preview as employee →</Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "16px 0" }}>
        <div className="card" style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Acknowledged</div>
          <div style={{ fontSize: "1.9rem", fontWeight: 700, color: "#16a34a", lineHeight: 1 }}>
            {ackedCount}<span style={{ fontSize: "1rem", color: "var(--mute)", fontWeight: 400 }}>/{totalUsers}</span>
          </div>
        </div>
        <div className="card" style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Pending</div>
          <div style={{ fontSize: "1.9rem", fontWeight: 700, color: pendingCount > 0 ? "#dc2626" : "#16a34a", lineHeight: 1 }}>{pendingCount}</div>
        </div>
      </div>

      {/* Policy points editor */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>
            Policy Points
            {points.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: "0.85rem", fontWeight: 400, color: "var(--mute)" }}>({points.length} total)</span>
            )}
          </h2>
        </div>
        <p className="mute" style={{ marginTop: 6, marginBottom: 16, fontSize: "0.83rem" }}>
          Adding or editing a point resets all acknowledgments and notifies all employees.
          Use <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>**bold**</code> for bold text,{" "}
          <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>- item</code> to start a bullet line.
        </p>
        <PolicyForm initial={points} />
      </div>

      {/* Acknowledged-by table */}
      {acks.length > 0 && (
        <div className="card">
          <h2>Acknowledged by ({acks.length})</h2>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Employee</th><th>ID</th><th>Acknowledged at</th></tr>
              </thead>
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
