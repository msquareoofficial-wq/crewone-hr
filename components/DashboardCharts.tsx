// Powered By Vistech Force
import type { DayRow } from "@/lib/hr";
import { fmtMonth } from "@/lib/fmtdate";

type TrendRow = { month: string; present: number; late_count: number };

// Short month label e.g. "Nov"
function shortMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

// Pad trend to always show 6 months (fill missing months with 0)
function padTrend(trend: TrendRow[]): TrendRow[] {
  const result: TrendRow[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const found = trend.find((t) => t.month === ym);
    result.push(found ?? { month: ym, present: 0, late_count: 0 });
  }
  return result;
}

export default function DashboardCharts({
  trend,
  monthRows,
  month,
}: {
  trend: TrendRow[];
  monthRows: DayRow[];
  month: string;
}) {
  const padded = padTrend(trend);
  const maxPresent = Math.max(...padded.map((t) => t.present), 1);

  // This month stats
  const totalDays = monthRows.length;
  const lateDays = monthRows.filter((r) => r.late).length;
  const onTimeDays = totalDays - lateDays;

  // Avg sign-in time (minutes from midnight) for on-time days
  const signInMins = monthRows
    .filter((r) => r.sign_in && !r.late)
    .map((r) => {
      const d = new Date(r.sign_in!);
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    });
  const avgSignIn = signInMins.length
    ? Math.round(signInMins.reduce((a, b) => a + b, 0) / signInMins.length)
    : null;
  const avgStr = avgSignIn !== null
    ? `${String(Math.floor(avgSignIn / 60)).padStart(2, "0")}:${String(avgSignIn % 60).padStart(2, "0")}`
    : "--:--";

  // Bar chart dimensions
  const BAR_W = 32;
  const GAP = 14;
  const CHART_H = 120;
  const totalW = padded.length * (BAR_W + GAP) - GAP;

  // Donut chart for on-time vs late
  const R = 42;
  const STROKE = 11;
  const CIRC = 2 * Math.PI * R;
  const latePct = totalDays > 0 ? lateDays / totalDays : 0;
  const onTimePct = 1 - latePct;

  return (
    <div className="grid g2" style={{ marginBottom: 18 }}>
      {/* Bar chart: 6-month attendance trend */}
      <div className="card">
        <h2>Attendance — last 6 months</h2>
        <svg width="100%" viewBox={`0 0 ${totalW + 2} ${CHART_H + 36}`} style={{ overflow: "visible" }}>
          {padded.map((t, i) => {
            const x = i * (BAR_W + GAP);
            const totalH = totalDays > 0
              ? Math.max(4, Math.round((t.present / maxPresent) * CHART_H))
              : 4;
            const lateH = t.present > 0
              ? Math.round((t.late_count / t.present) * totalH)
              : 0;
            const onTimeH = totalH - lateH;
            const barY = CHART_H - totalH;

            return (
              <g key={t.month}>
                {/* Green (on-time) portion */}
                <rect
                  x={x} y={barY + lateH} width={BAR_W} height={onTimeH}
                  rx={onTimeH === totalH ? 4 : 0} ry={onTimeH === totalH ? 4 : 0}
                  style={{ fill: "var(--ok, #22c55e)" }}
                />
                {/* Red (late) portion on top */}
                {lateH > 0 && (
                  <rect
                    x={x} y={barY} width={BAR_W} height={lateH}
                    rx={4} ry={4}
                    style={{ fill: "var(--bad, #ef4444)" }}
                  />
                )}
                {/* Value label */}
                {t.present > 0 && (
                  <text
                    x={x + BAR_W / 2} y={barY - 4}
                    textAnchor="middle" fontSize={11}
                    style={{ fill: "var(--mute, #6b7280)" }}
                  >
                    {t.present}
                  </text>
                )}
                {/* Month label */}
                <text
                  x={x + BAR_W / 2} y={CHART_H + 18}
                  textAnchor="middle" fontSize={11}
                  style={{ fill: "var(--mute, #6b7280)", fontWeight: padded[i].month === month ? 700 : 400 }}
                >
                  {shortMonth(t.month)}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="row" style={{ marginTop: 4, gap: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--mute)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ok, #22c55e)", display: "inline-block" }} />
            On time
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--mute)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--bad, #ef4444)", display: "inline-block" }} />
            Late
          </span>
        </div>
      </div>

      {/* Donut: this month on-time vs late */}
      <div className="card">
        <h2>{fmtMonth(month)} — On-time vs Late</h2>
        {totalDays === 0 ? (
          <p className="mute">No attendance records this month yet.</p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <svg width={110} height={110} viewBox="0 0 110 110">
              {/* Background track */}
              <circle cx={55} cy={55} r={R} fill="none"
                stroke="var(--line, #e5e7eb)" strokeWidth={STROKE} />
              {/* On-time arc */}
              <circle cx={55} cy={55} r={R} fill="none"
                stroke="var(--ok, #22c55e)" strokeWidth={STROKE}
                strokeDasharray={`${onTimePct * CIRC} ${latePct * CIRC}`}
                strokeDashoffset={CIRC * 0.25}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray .6s ease" }}
              />
              {/* Late arc */}
              {latePct > 0 && (
                <circle cx={55} cy={55} r={R} fill="none"
                  stroke="var(--bad, #ef4444)" strokeWidth={STROKE}
                  strokeDasharray={`${latePct * CIRC} ${onTimePct * CIRC}`}
                  strokeDashoffset={CIRC * 0.25 - onTimePct * CIRC}
                  strokeLinecap="round"
                />
              )}
              {/* Centre label */}
              <text x={55} y={51} textAnchor="middle" fontSize={16} fontWeight={700}
                style={{ fill: "var(--ink, #111)" }}>
                {totalDays}
              </text>
              <text x={55} y={65} textAnchor="middle" fontSize={10}
                style={{ fill: "var(--mute, #6b7280)" }}>
                days
              </text>
            </svg>
            <div style={{ flex: 1, minWidth: 130 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "var(--mute)", marginBottom: 2 }}>On time</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ok, #22c55e)" }}>{onTimeDays}</div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{Math.round(onTimePct * 100)}% of days</div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "var(--mute)", marginBottom: 2 }}>Late</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--bad, #ef4444)" }}>{lateDays}</div>
                <div style={{ fontSize: 11, color: "var(--mute)" }}>{Math.round(latePct * 100)}% of days</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--mute)", marginBottom: 2 }}>Avg sign-in (on time)</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{avgStr}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
