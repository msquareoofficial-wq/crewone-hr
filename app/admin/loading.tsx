// Powered By Vistech Force
export default function Loading() {
  return (
    <div className="wrap">
      <div className="skel skel-h1" />
      <div className="grid g4" style={{ marginBottom: 18 }}>
        {[...Array(6)].map((_, i) => <div key={i} className="skel" style={{ minHeight: 80, borderRadius: 14 }} />)}
      </div>
      <div className="skel skel-card" style={{ minHeight: 200, marginBottom: 18 }} />
      <div className="grid g2">
        <div className="skel skel-card" style={{ minHeight: 160 }} />
        <div className="skel skel-card" style={{ minHeight: 160 }} />
      </div>
    </div>
  );
}
