// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FinUsdColorForm({ c1, c2 }: { c1: string; c2: string }) {
  const router = useRouter();
  const [col1, setCol1] = useState(c1);
  const [col2, setCol2] = useState(c2);
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);

  const preview = `linear-gradient(135deg, ${col1}, ${col2})`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: "0.82rem", color: "var(--mute)" }}>Start color</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input type="color" value={col1} onChange={(e) => setCol1(e.target.value)} style={{ width: 44, height: 36, padding: 2, border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }} />
            <input type="text" value={col1} onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setCol1(e.target.value); }} style={{ width: 90, fontFamily: "monospace" }} maxLength={7} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: "0.82rem", color: "var(--mute)" }}>End color</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input type="color" value={col2} onChange={(e) => setCol2(e.target.value)} style={{ width: 44, height: 36, padding: 2, border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }} />
            <input type="text" value={col2} onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setCol2(e.target.value); }} style={{ width: 90, fontFamily: "monospace" }} maxLength={7} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: "0.82rem", color: "var(--mute)" }}>Preview</label>
          <div style={{ marginTop: 4, width: 160, height: 52, borderRadius: 12, background: preview, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 14px" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>$1,250</span>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>Dollar Expenses</span>
          </div>
        </div>
      </div>
      {msg && <div className={msg.t} style={{ marginBottom: 10 }}>{msg.m}</div>}
      <button className="btn" onClick={async () => {
        const r = await fetch("/api/admin/fin-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ c1: col1, c2: col2 }) });
        const j = await r.json();
        setMsg(r.ok ? { t: "okmsg", m: "Dollar tile colors saved" } : { t: "err", m: j.error });
        if (r.ok) router.refresh();
      }}>Save colors</button>
    </div>
  );
}
