// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <div className="skel skel-btn" />
        <div className="skel skel-btn" />
      </div>
      <div className="grid g3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="skel skel-line w60" style={{ height: 18 }} />
            <div className="skel skel-line w80" />
            <div className="skel skel-line w40" />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {[...Array(3)].map((_, j) => <div key={j} className="skel skel-avatar" style={{ width: 28, height: 28 }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <div className="skel skel-badge" />
              <div className="skel skel-line w30" style={{ height: 12, marginBottom: 0 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
