// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="skel skel-line w40" style={{ height: 18, marginBottom: 16 }} />
        <div className="skel" style={{ height: 36, borderRadius: 8, marginBottom: 10 }} />
        <div className="skel" style={{ height: 80, borderRadius: 8, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <div className="skel skel-btn" />
          <div className="skel skel-btn" />
        </div>
      </div>
      <div className="card">
        <div className="skel skel-line w30" style={{ height: 18, marginBottom: 16 }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skel-row">
            <div className="skel skel-avatar" style={{ borderRadius: 8 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="skel skel-line w80" style={{ height: 13, marginBottom: 0 }} />
              <div className="skel skel-line w60" style={{ height: 11, marginBottom: 0 }} />
            </div>
            <div className="skel skel-line w30" style={{ height: 11, marginBottom: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
