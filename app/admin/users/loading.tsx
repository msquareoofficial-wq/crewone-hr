// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="skel skel-line w40" style={{ height: 18, marginBottom: 16 }} />
        <div className="grid g3" style={{ marginBottom: 12 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skel" style={{ height: 36, borderRadius: 8 }} />)}
        </div>
        <div className="skel skel-btn" />
      </div>
      <div className="card">
        <div className="skel skel-line w30" style={{ height: 18, marginBottom: 16 }} />
        <div className="scroll">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skel-row">
              <div className="skel skel-avatar" />
              <div className="skel skel-cell" />
              <div className="skel skel-cell" />
              <div className="skel skel-cell" />
              <div className="skel skel-cell" style={{ maxWidth: 80 }} />
              <div className="skel skel-badge" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
