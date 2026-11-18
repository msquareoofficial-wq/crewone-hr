// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTS: [string, string][] = [
  ["attendance", "Attendance, breaks and tasks"],
  ["leaves", "Leave requests"],
  ["payroll", "Payroll records"],
  ["notifications", "Notifications, comments and holidays (all months)"],
  ["chat", "Chat messages and files (all months)"],
];

export default function ResetData() {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [month, setMonth] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);
  async function go() {
    if (!window.confirm("This permanently deletes the selected data. Continue?")) return;
    try {
      const r = await fetch("/api/admin/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scopes: sel, month, confirm }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) return setMsg({ t: "err", m: j.error || "Reset failed" });
      setMsg({ t: "okmsg", m: "Data reset done" }); setSel([]); setConfirm(""); router.refresh();
    } catch { setMsg({ t: "err", m: "Network error" }); }
  }
  return (
    <div className="grid" style={{ maxWidth: 520 }}>
      <p className="mute" style={{ margin: 0 }}>Clears test data. Users, admin account, settings and logos are never deleted.</p>
      {OPTS.map(([k, l]) => (
        <label key={k} className="row" style={{ color: "var(--ink)", fontWeight: 400, cursor: "pointer" }}>
          <input type="checkbox" style={{ width: "auto" }} checked={sel.includes(k)} onChange={() => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))} />{l}
        </label>
      ))}
      <div><label>Only this month (leave empty to reset all months). Applies to attendance, leaves and payroll.</label><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      <div><label>Type RESET to confirm</label><input value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      {msg && <div className={msg.t}>{msg.m}</div>}
      <div><button className="btn bad" disabled={!sel.length || confirm !== "RESET"} onClick={go}>Reset selected data</button></div>
    </div>
  );
}
