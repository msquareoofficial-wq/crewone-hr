// Powered By Vistech Force
"use client";

const IcAlert = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="28" stroke="#ef4444" strokeWidth="3" opacity="0.7" />
    <path d="M32 20v16" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="32" cy="44" r="2.5" fill="#ef4444" />
  </svg>
);

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8f9fb" }}>
        <div className="err-global" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 40, textAlign: "center" }}>
          <IcAlert />
          <strong style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Application error</strong>
          <p style={{ fontSize: 14, color: "#64748b", maxWidth: 340, lineHeight: 1.6, margin: 0 }}>
            A critical error occurred. Please refresh the page. If this keeps happening, contact support.
          </p>
          {error.digest && (
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", background: "#e2e8f0", padding: "4px 10px", borderRadius: 6 }}>
              Error ID: {error.digest}
            </span>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={reset} style={{ padding: "8px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              Try again
            </button>
            <a href="/" style={{ padding: "8px 20px", background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, textDecoration: "none", fontSize: 14 }}>
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
