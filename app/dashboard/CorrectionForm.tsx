// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CorrectionForm({ today, items }: { today: string; items: { id: number; work_date: string; req_in: string | null; req_out: string | null; status: string; admin_note: string | null }[] }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <div>
      <form className="grid" onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = Object.fromEntries(new FormData(form).entries());
        const r = await fetch("/api/corrections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
        let j: any = {}; try { j = await r.json(); } catch {}
        if (!r.ok) { setErr(j.error || "Error"); setOk(false); return; }
        setErr(""); setOk(true); form.reset(); router.refresh();
      }}>
        <div><label>Date</label><input type="date" name="work_date" max={today} required /></div>
        <div className="row">
          <div style={{ flex: 1 }}><label>Correct IN time</label><input type="time" name="req_in" /></div>
          <div style={{ flex: 1 }}><label>Correct OUT time</label><input type="time" name="req_out" /></div>
        </div>
        <div><label>Reason</label><input name="reason" placeholder="e.g. forgot to click OUT" required /></div>
        {err && <div className="err">{err}</div>}
        {ok && <div className="okmsg">Request sent to admin</div>}
        <button className="btn">Request correction</button>
      </form>
      {items.length > 0 && (
        <div className="scroll" style={{ marginTop: 14 }}><table>
          <thead><tr><th>Date</th><th>IN</th><th>OUT</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>{items.map((c) => (
            <tr key={c.id}><td>{c.work_date}</td><td>{c.req_in ?? "-"}</td><td>{c.req_out ?? "-"}</td>
              <td><span className={`badge ${c.status === "approved" ? "b-ok" : c.status === "rejected" ? "b-bad" : "b-warn"}`}>{c.status}</span></td><td>{c.admin_note ?? "-"}</td></tr>))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
