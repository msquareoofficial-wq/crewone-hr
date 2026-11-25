// Powered By Vistech Force
"use client";
import { useState } from "react";

export default function PolicyAckButton({ initialAcknowledged }: { initialAcknowledged: boolean }) {
  const [acked, setAcked] = useState(initialAcknowledged);
  const [busy, setBusy] = useState(false);

  async function acknowledge() {
    if (acked) return;
    setBusy(true);
    try {
      const r = await fetch("/api/policy/ack", { method: "POST" });
      if (r.ok) setAcked(true);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
      <button
        type="button"
        onClick={acknowledge}
        disabled={busy || acked}
        style={{
          padding: "14px 40px",
          borderRadius: 12,
          fontWeight: 700,
          fontSize: "1rem",
          border: "none",
          cursor: acked ? "default" : "pointer",
          transition: "background 0.3s, color 0.3s",
          background: acked ? "#16a34a" : "var(--brand, #4f46e5)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
        aria-label={acked ? "Policy acknowledged" : "Acknowledge company policy"}
      >
        {acked ? (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Policy Acknowledged
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            {busy ? "Saving…" : "I have read and acknowledge this policy"}
          </>
        )}
      </button>
    </div>
  );
}
