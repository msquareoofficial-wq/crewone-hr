// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card" style={{ marginBottom: 18 }}>
          <div className="skel skel-line w40" style={{ height: 18, marginBottom: 16 }} />
          <div className="grid g2" style={{ marginBottom: 12 }}>
            {[...Array(4)].map((_, j) => (
              <div key={j} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="skel skel-line w40" style={{ height: 11 }} />
                <div className="skel" style={{ height: 36, borderRadius: 8 }} />
              </div>
            ))}
          </div>
          <div className="skel skel-btn" />
        </div>
      ))}
    </div>
  );
}
