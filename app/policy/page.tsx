// Powered By Vistech Force
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import Shell from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";
import PolicyAckButton from "./PolicyAckButton";

type PolicyPoint = { id: number; title: string; body: string; sort_order: number };

async function getPolicyPoints(): Promise<PolicyPoint[]> {
  try {
    return await q<PolicyPoint>(
      "SELECT id, title, body, sort_order FROM policy_points ORDER BY sort_order ASC, id ASC"
    );
  } catch { return []; }
}

async function getAckStatus(userId: number): Promise<boolean> {
  try {
    const [ack, lu] = await Promise.all([
      q<{ acked_at: string }>("SELECT acked_at FROM policy_acks WHERE user_id=$1", [userId]),
      q<{ value: string }>("SELECT value FROM settings WHERE key='policy_last_updated'"),
    ]);
    const ackedAt = ack[0]?.acked_at ? new Date(ack[0].acked_at) : null;
    const lastUpdated = lu[0]?.value ? new Date(lu[0].value) : null;
    return !!ackedAt && (!lastUpdated || ackedAt >= lastUpdated);
  } catch { return false; }
}

export default async function PolicyPage() {
  const user = await requireUser();
  const [points, acknowledged] = await Promise.all([
    getPolicyPoints(),
    getAckStatus(user.id),
  ]);

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
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            {points.map((p, i) => (
              <div key={p.id} className="card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minWidth: 36, height: 36, borderRadius: "50%",
                  background: "var(--brand)", color: "#fff",
                  fontWeight: 700, fontSize: "0.95rem", flexShrink: 0,
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>{p.title}</h3>
                  {p.body && <PolicyBody text={p.body} />}
                </div>
              </div>
            ))}
          </div>
          <PolicyAckButton initialAcknowledged={acknowledged} />
        </>
      )}
    </Shell>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  );
}

function PolicyBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (bullets.length) {
      elements.push(
        <ul key={elements.length} style={{ margin: "6px 0 6px 0", paddingLeft: 20, lineHeight: 1.7 }}>
          {bullets.map((b, i) => <li key={i}>{renderInline(b)}</li>)}
        </ul>
      );
      bullets = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("- ") || line.startsWith("• ")) {
      bullets.push(line.slice(2));
    } else {
      flushBullets();
      if (line.trim()) {
        elements.push(
          <p key={elements.length} style={{ margin: "4px 0", lineHeight: 1.65 }}>
            {renderInline(line)}
          </p>
        );
      }
    }
  }
  flushBullets();
  return <div style={{ color: "var(--fg, var(--ink))" }}>{elements}</div>;
}
