// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

type Punch = { type: "in" | "out"; at: string };

function fmt12(ts: string, tz: string) {
  try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(ts)); } catch { return ts; }
}

export default function AttendanceButtons({ state, canUndo, punches = [], tz = "America/New_York" }: { state: "none" | "in" | "out"; canUndo?: boolean; punches?: Punch[]; tz?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go(action: "in" | "out" | "undo_out") {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) { toast(j.error || "Attendance error", "bad"); setErr(j.error || "Error"); }
      else {
        if (action === "in") toast("Marked IN — have a great day!", "ok");
        else if (action === "out") toast("Marked OUT — see you tomorrow!", "ok");
        else toast("OUT undone", "warn");
        router.refresh();
      }
    } catch { setErr("Network error, please try again"); }
    setBusy(false);
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: punches.length ? 10 : 0 }}>
        {(state === "none" || state === "out") && (
          <button className="btn ok" style={{ fontSize: 18, padding: "12px 34px" }} disabled={busy} onClick={() => go("in")}>IN</button>
        )}
        {state === "in" && (
          <button className="btn bad" style={{ fontSize: 18, padding: "12px 34px" }} disabled={busy} onClick={() => go("out")}>OUT</button>
        )}
        {state === "none" && <span className="mute">Click IN to mark your attendance for today.</span>}
        {state === "in" && <span className="mute">Attendance is marked OUT only when you click OUT.</span>}
        {state === "out" && <span className="mute">You are OUT — click IN to mark in again.</span>}
        {state === "out" && canUndo && (
          <button className="btn warn sm" disabled={busy} onClick={() => go("undo_out")}>Undo OUT</button>
        )}
        {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
      </div>

      {punches.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="mute" style={{ fontSize: 12, marginBottom: 4 }}>Today&apos;s punch log</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
            {punches.map((p, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13 }}>
                <span className={"badge " + (p.type === "in" ? "b-ok" : "b-bad")} style={{ padding: "1px 8px", fontSize: 11 }}>{p.type.toUpperCase()}</span>
                <span>{fmt12(p.at, tz)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
