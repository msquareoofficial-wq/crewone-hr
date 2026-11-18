// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AttendanceButtons({ state, canUndo }: { state: "none" | "in" | "out"; canUndo?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go(action: "in" | "out" | "undo_out") {
    if (action === "out" && !confirm("Mark OUT for today? You cannot mark IN again today.")) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) setErr(j.error || "Error"); else router.refresh();
    } catch { setErr("Network error, please try again"); }
    setBusy(false);
  }
  return (
    <div className="row">
      {state === "none" && <button className="btn ok" style={{ fontSize: 18, padding: "12px 34px" }} disabled={busy} onClick={() => go("in")}>IN</button>}
      {state === "in" && <button className="btn bad" style={{ fontSize: 18, padding: "12px 34px" }} disabled={busy} onClick={() => go("out")}>OUT</button>}
      {state === "out" && <span className="badge b-mute">You are OUT for today</span>}
      {state === "out" && canUndo && <button className="btn warn sm" disabled={busy} onClick={() => go("undo_out")}>Undo OUT (clicked by mistake)</button>}
      {state === "out" && !canUndo && <span className="mute">Marked OUT by mistake? Ask the admin to re-open your day.</span>}
      {state === "none" && <span className="mute">Click IN to mark your attendance for today.</span>}
      {state === "in" && <span className="mute">Attendance is marked OUT only when you click OUT.</span>}
      {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
    </div>
  );
}
