// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

type Punch = { type: "in" | "out"; at: string };

function fmt12(ts: string, tz: string) {
  try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(ts)); } catch { return ts; }
}

function LateReasonModal({ diff, onSubmit, onSkip }: { diff: number; onSubmit: (r: string) => Promise<void>; onSkip: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!reason.trim()) { setErr("Please enter a reason"); return; }
    setBusy(true);
    await onSubmit(reason.trim());
    setBusy(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "var(--card)", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 38, height: 38, borderRadius: "50%", background: "#fef2f2", flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>You are late by {diff} minute{diff !== 1 ? "s" : ""}</div>
            <div className="mute" style={{ fontSize: "0.82rem" }}>Please provide a reason for being late</div>
          </div>
        </div>
        <textarea
          value={reason}
          onChange={e => { setReason(e.target.value); setErr(""); }}
          placeholder="e.g. Traffic, power outage, medical appointment…"
          rows={3}
          maxLength={300}
          autoFocus
          style={{ width: "100%", resize: "vertical", marginBottom: 6 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: err ? 8 : 0 }}>
          <span className="mute" style={{ fontSize: "0.75rem" }}>{reason.length}/300</span>
        </div>
        {err && <div className="err" style={{ marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="btn" onClick={submit} disabled={busy} style={{ flex: 1 }}>
            {busy ? "Submitting…" : "Submit reason"}
          </button>
          <button className="btn sec" onClick={onSkip} disabled={busy}>Skip</button>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceButtons({ state, canUndo, punches = [], tz = "America/New_York" }: { state: "none" | "in" | "out"; canUndo?: boolean; punches?: Punch[]; tz?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lateModal, setLateModal] = useState<{ diff: number } | null>(null);

  async function go(action: "in" | "out" | "undo_out") {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) { toast(j.error || "Attendance error", "bad"); setErr(j.error || "Error"); }
      else {
        if (action === "in") {
          if (j.late && j.diff > 0) {
            // Show late reason modal before refreshing
            setLateModal({ diff: j.diff });
            toast(`Marked IN — late by ${j.diff} min`, "warn");
          } else {
            toast("Marked IN — have a great day!", "ok");
            router.refresh();
          }
        } else if (action === "out") {
          toast("Marked OUT — see you tomorrow!", "ok");
          router.refresh();
        } else {
          toast("OUT undone", "warn");
          router.refresh();
        }
      }
    } catch { setErr("Network error, please try again"); }
    setBusy(false);
  }

  async function submitReason(reason: string) {
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "late_reason", reason }),
      });
      toast("Reason submitted", "ok");
    } catch {}
    setLateModal(null);
    router.refresh();
  }

  return (
    <div>
      {lateModal && (
        <LateReasonModal
          diff={lateModal.diff}
          onSubmit={submitReason}
          onSkip={() => { setLateModal(null); router.refresh(); }}
        />
      )}

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
