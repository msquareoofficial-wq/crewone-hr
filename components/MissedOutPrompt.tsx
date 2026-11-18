// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// User: shown instead of the IN button when an earlier day has no real OUT.
export default function MissedOutPrompt({ workDate, dateLabel, autoTime, autoHHMM }: { workDate: string; dateLabel: string; autoTime: string; autoHHMM: string }) {
  const router = useRouter();
  const [t, setT] = useState(autoHHMM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send(time: string | null) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm_out", work_date: workDate, time }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) setErr(j.error || "Error"); else router.refresh();
    } catch { setErr("Network error, please try again"); }
    setBusy(false);
  }
  return (
    <div className="mo-box">
      <div className="mo-t">You did not mark OUT on {dateLabel}</div>
      <p className="mute" style={{ margin: "4px 0 10px" }}>The system set your OUT to <b>{autoTime}</b> (end of your shift). Confirm it, or enter the time you really left. You can mark IN after this.</p>
      <div className="row">
        <input type="time" value={t} onChange={(e) => setT(e.target.value)} style={{ width: 150 }} />
        <button className="btn sm" disabled={busy || !t || t === autoHHMM} onClick={() => send(t)}>Send my OUT time</button>
        <button className="btn sec sm" disabled={busy} onClick={() => send(null)}>{autoTime} is correct</button>
      </div>
      {t !== autoHHMM && <p className="mute" style={{ margin: "8px 0 0" }}>Your time goes to the admin for approval. Until then {autoTime} is used.</p>}
      {err && <p className="err" style={{ margin: "8px 0 0" }}>{err}</p>}
    </div>
  );
}
