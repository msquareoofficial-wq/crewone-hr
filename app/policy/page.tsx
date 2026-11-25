// Powered By Vistech Force
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import Shell from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";

type PolicyPoint = { id: number; title: string; body: string; sort_order: number };

async function getPolicyPoints(): Promise<PolicyPoint[]> {
  try {
    return await q<PolicyPoint>(
      "SELECT id, title, body, sort_order FROM policy_points ORDER BY sort_order ASC, id ASC"
    );
  } catch {
    return [];
  }
}

export default async function PolicyPage() {
  const user = await requireUser();
  const points = await getPolicyPoints();

  return (
    <Shell user={user}>
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Company Policy" }]} />
      <h1>Company Policy</h1>
      {points.length === 0 ? (
        <div className="card">
          <p className="mute" style={{ textAlign: "center", padding: "32px 0" }}>
            No policy points have been added yet.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {points.map((p, i) => (
            <div key={p.id} className="card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                minWidth: 36, height: 36, borderRadius: "50%",
                background: "var(--accent)", color: "#fff",
                fontWeight: 700, fontSize: "0.95rem", flexShrink: 0,
              }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>{p.title}</h3>
                {p.body && (
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--fg)" }}>
                    {p.body}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
