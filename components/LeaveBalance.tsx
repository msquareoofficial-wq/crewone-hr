// Powered By Vistech Force

export default function LeaveBalance({ used, quota, left, year }: {
  used: number; quota: number; left: number; year: string;
}) {
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const color = left === 0 ? "var(--bad)" : left <= Math.ceil(quota * 0.2) ? "#f59e0b" : "var(--ok)";
  const trackColor = left === 0 ? "#fee2e2" : left <= Math.ceil(quota * 0.2) ? "#fef3c7" : "#dcfce7";

  return (
    <div className="leave-bal">
      <div className="leave-bal-top">
        <div>
          <div className="leave-bal-label">Leave Balance {year}</div>
          <div className="leave-bal-main">
            <span className="leave-bal-num" style={{ color }}>{left}</span>
            <span className="leave-bal-of"> of {quota} days left</span>
          </div>
        </div>
        <div className="leave-bal-ring" style={{ "--pct": pct, "--clr": color } as React.CSSProperties}>
          <svg viewBox="0 0 36 36" width="64" height="64">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={trackColor} strokeWidth="3.2" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3.2"
              strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset="25"
              strokeLinecap="round" style={{ transition: "stroke-dasharray .6s ease" }} />
          </svg>
          <div className="leave-bal-pct">{pct}%</div>
        </div>
      </div>
      <div className="leave-bal-bar-wrap" title={`${used} used of ${quota}`}>
        <div className="leave-bal-bar-track">
          <div className="leave-bal-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <div className="leave-bal-row">
        <span className="leave-bal-stat"><span className="leave-bal-dot" style={{ background: color }} />{used} used</span>
        <span className="leave-bal-stat"><span className="leave-bal-dot" style={{ background: "var(--line)" }} />{left} remaining</span>
        <span className="leave-bal-stat mute">{quota} total</span>
      </div>
    </div>
  );
}
