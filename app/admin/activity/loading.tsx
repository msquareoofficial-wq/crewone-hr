// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <div className="skel" style={{ height: 34, width: 180, borderRadius: 8 }} />
        <div className="skel skel-btn" />
      </div>
      <div className="card">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="skel-row">
            <div className="skel skel-avatar" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <div className="skel skel-line w80" style={{ height: 13, marginBottom: 0 }} />
              <div className="skel skel-line w40" style={{ height: 11, marginBottom: 0 }} />
            </div>
            <div className="skel skel-line w30" style={{ height: 11, marginBottom: 0, maxWidth: 90 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
