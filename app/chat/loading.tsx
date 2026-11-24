// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      <div style={{ display: "flex", gap: 16, height: 520 }}>
        {/* Sidebar */}
        <div className="card" style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, padding: 12 }}>
          <div className="skel skel-line" style={{ height: 32, borderRadius: 8, marginBottom: 10 }} />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="skel-row" style={{ padding: "8px 0", borderBottom: "none" }}>
              <div className="skel skel-avatar" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <div className="skel skel-line w80" style={{ height: 12, marginBottom: 0 }} />
                <div className="skel skel-line w60" style={{ height: 10, marginBottom: 0 }} />
              </div>
            </div>
          ))}
        </div>
        {/* Chat area */}
        <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 8 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 10, flexDirection: i % 2 === 0 ? "row" : "row-reverse" }}>
                <div className="skel skel-avatar" />
                <div className="skel" style={{ height: 40, width: `${40 + (i * 7) % 25}%`, borderRadius: 12 }} />
              </div>
            ))}
          </div>
          <div className="skel" style={{ height: 42, borderRadius: 10, margin: 8 }} />
        </div>
      </div>
    </div>
  );
}
