// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      <div className="grid g3" style={{ marginBottom: 18 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card stat" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="skel skel-line w60" style={{ height: 12 }} />
            <div className="skel skel-line w40" style={{ height: 28 }} />
          </div>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="skel skel-line w30" style={{ height: 18, marginBottom: 16 }} />
        <div className="skel" style={{ height: 220, borderRadius: 10 }} />
      </div>
      <div className="card">
        <div className="skel skel-line w30" style={{ height: 18, marginBottom: 16 }} />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skel-row">
            <div className="skel skel-cell" />
            <div className="skel skel-cell" />
            <div className="skel skel-cell" style={{ maxWidth: 100 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
