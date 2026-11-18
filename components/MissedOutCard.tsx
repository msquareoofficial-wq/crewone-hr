// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: number; name: string; emp_id: string; dateLabel: string; signIn: string; outLabel: string; open: boolean; hhmm: string };

// Admin: people who forgot to mark OUT. Set the real time or keep the automatic shift-end OUT.
export default function MissedOutCard({ items }: { items: Item[] }) {
  const router = useRouter();
  const [times, setTimes] = useState<Record<number, string>>(Object.fromEntries(items.map((i) => [i.id, i.hhmm])));
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  async function save(i: Item, time: string | null) {
    setBusy(i.id); setErr("");
    try {
      const r = await fetch("/api/admin/missed-out", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: i.id, time }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) setErr(j.error || "Error"); else router.refresh();
    } catch { setErr("Network error, please try again"); }
    setBusy(null);
  }
  return (
    <div className="card" style={{ borderLeft: "4px solid var(--warn)" }}>
      <h2>Forgot to mark OUT ({items.length})</h2>
      <p className="mute" style={{ marginTop: 0 }}>These days have no real OUT. The system closed them at the end of the shift. Set the real OUT time, or keep the shift end.</p>
      <div className="scroll"><table>
        <thead><tr><th>User</th><th>Date</th><th>IN</th><th>OUT now</th><th>Real OUT time</th><th></th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.name} <span className="mute">({i.emp_id})</span></td>
              <td>{i.dateLabel}</td>
              <td>{i.signIn}</td>
              <td><span className="badge b-warn">{i.open ? "Still open" : i.outLabel + " (auto)"}</span></td>
              <td><input type="time" value={times[i.id]} onChange={(e) => setTimes({ ...times, [i.id]: e.target.value })} style={{ width: 140 }} /></td>
              <td><div className="row"><button className="btn sm" disabled={busy === i.id || !times[i.id]} onClick={() => save(i, times[i.id])}>Save OUT</button><button className="btn sec sm" disabled={busy === i.id} onClick={() => save(i, null)}>Keep shift end</button></div></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
