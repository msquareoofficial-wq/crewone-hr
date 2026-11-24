// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      <div className="card">
        <div className="skel skel-line w40" style={{ height: 18, marginBottom: 16 }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skel-row">
            <div className="skel skel-avatar" />
            <div className="skel skel-cell" />
            <div className="skel skel-cell" />
            <div className="skel skel-cell" style={{ maxWidth: 120 }} />
            <div className="skel skel-badge" />
            <div className="skel skel-btn" style={{ width: 80 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
