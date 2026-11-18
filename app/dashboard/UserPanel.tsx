// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CatIcon from "@/components/CatIcon";
import { BREAK_CATS, catLabel } from "@/lib/breakcats";
import "@/components/breaklog.css";

function useElapsed(since: string | null) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!since) return setS(0);
    const tick = () => setS(Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [since]);
  const h = String(Math.floor(s / 3600)).padStart(2, "0"), m = String(Math.floor((s % 3600) / 60)).padStart(2, "0"), sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function UserPanel({ onBreak, breakSince, breakCat, task }: { onBreak: boolean; breakSince: string | null; breakCat?: string | null; task: { title: string; since: string } | null }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(false);
  const breakTimer = useElapsed(onBreak ? breakSince : null);
  const taskTimer = useElapsed(task?.since ?? null);

  async function call(url: string, body: any) {
    setBusy(true); setErr("");
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error || "Error");
    setTitle("");
    setPick(false);
    router.refresh();
  }

  return (
    <div className="card">
      <h2>Task and Break</h2>
      {onBreak ? (
        <div>
          <span className="badge b-warn">On break</span> <span className="bk-now"><CatIcon cat={breakCat} size={16} /> {catLabel(breakCat)}</span>
          <div className="big" style={{ margin: "8px 0" }}>{breakTimer}</div>
          {task && <div className="mute" style={{ marginBottom: 8 }}>Task still running: <b>{task.title}</b> ({taskTimer})</div>}
          <div className="row">
            <button className="btn ok" disabled={busy} onClick={() => call("/api/break", { action: "end" })}>Back to seat (Break off)</button>
            {task && <button className="btn bad" disabled={busy} onClick={() => call("/api/task", { action: "end" })}>End task</button>}
          </div>
        </div>
      ) : task ? (
        <div>
          <span className="badge b-info">Working: {task.title}</span>
          <div className="big" style={{ margin: "8px 0" }}>{taskTimer}</div>
          <div className="row">
            <button className="btn bad" disabled={busy} onClick={() => call("/api/task", { action: "end" })}>End task</button>
            <button className="btn warn" disabled={busy} onClick={() => setPick(true)}>Break start</button>
          </div>
        </div>
      ) : (
        <div className="grid">
          <div className="row">
            <input placeholder="Task name" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <button className="btn ok" disabled={busy || !title.trim()} onClick={() => call("/api/task", { action: "start", title })}>Start task</button>
          </div>
          <div><button className="btn warn" disabled={busy} onClick={() => setPick(true)}>Break start</button></div>
        </div>
      )}
      {err && <div className="err">{err}</div>}
      {pick && (
        <div className="bk-ov" onClick={() => !busy && setPick(false)}>
          <div className="bk-modal" onClick={(e) => e.stopPropagation()}>
            <h3>What kind of break?</h3>
            <p className="mute" style={{ margin: "0 0 14px" }}>Pick one to start your break.</p>
            <div className="bk-grid">
              {BREAK_CATS.map((c) => (
                <button key={c.key} className={"bk-opt bk-" + c.key} disabled={busy} onClick={() => call("/api/break", { action: "start", category: c.key })}>
                  <span className="bk-ic"><CatIcon cat={c.key} size={28} /></span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
            <button className="btn sec sm" style={{ marginTop: 14 }} onClick={() => setPick(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
