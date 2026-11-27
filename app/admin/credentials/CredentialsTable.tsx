// Powered By Vistech Force
"use client";
import { useState } from "react";
import Link from "next/link";

type User = {
  id: number;
  name: string;
  emp_id: string;
  designation: string | null;
  department: string | null;
  plain_password: string | null;
  active: boolean;
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function PasswordCell({ password }: { password: string | null }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!password) {
    return <span className="mute" style={{ fontSize: "0.82rem" }}>Not set (user may have changed it)</span>;
  }

  async function copy() {
    await navigator.clipboard.writeText(password!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "monospace", fontSize: "0.9rem", letterSpacing: visible ? 0 : 2 }}>
        {visible ? password : "••••••••"}
      </span>
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        title={visible ? "Hide" : "Show"}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--mute)", display: "flex", alignItems: "center" }}
      >
        <EyeIcon open={visible} />
      </button>
      <button
        type="button"
        onClick={copy}
        title="Copy password"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: copied ? "#16a34a" : "var(--mute)", display: "flex", alignItems: "center" }}
      >
        {copied ? "✓" : <CopyIcon />}
      </button>
    </div>
  );
}

export default function CredentialsTable({ users }: { users: User[] }) {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const filtered = users.filter(u => {
    if (!showInactive && !u.active) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.emp_id.toLowerCase().includes(q) || (u.department ?? "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, department…"
          style={{ flex: 1, minWidth: 200, maxWidth: 340 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
        <span className="mute" style={{ fontSize: "0.82rem" }}>{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="mute" style={{ textAlign: "center", padding: "24px 0" }}>No employees found.</p>
      ) : (
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Password</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ opacity: u.active ? 1 : 0.55 }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{u.name}</div>
                    {u.designation && <div className="mute" style={{ fontSize: "0.78rem" }}>{u.designation}</div>}
                    {!u.active && <span className="badge b-mute" style={{ fontSize: "0.72rem", marginTop: 2 }}>Inactive</span>}
                  </td>
                  <td><span style={{ fontFamily: "monospace", fontWeight: 600 }}>{u.emp_id}</span></td>
                  <td>{u.department ?? <span className="mute">—</span>}</td>
                  <td><PasswordCell password={u.plain_password} /></td>
                  <td><Link href={`/admin/users/${u.id}`} className="btn sec sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
