// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <div className="skel" style={{ height: 34, width: 160, borderRadius: 8 }} />
        <div className="skel skel-btn" />
      </div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card stat" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="skel skel-line w60" style={{ height: 12 }} />
            <div className="skel skel-line w40" style={{ height: 26 }} />
          </div>
        ))}
      </div>
      <div className="card">
        <div className="skel skel-line w30" style={{ height: 18, marginBottom: 16 }} />
        {[...Array(7)].map((_, i) => (
          <div key={i} className="skel-row">
            <div className="skel skel-avatar" />
            <div className="skel skel-cell" />
            <div className="skel skel-cell" />
            <div className="skel skel-cell" style={{ maxWidth: 80 }} />
            <div className="skel skel-badge" />
          </div>
        ))}
      </div>
    </div>
  );
}
