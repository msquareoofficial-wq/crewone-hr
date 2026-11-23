// Powered By Vistech Force

type DayStatus = "present" | "late" | "leave" | "holiday" | "absent" | "future" | "off";

const STATUS_COLOR: Record<DayStatus, string> = {
  present:  "#22c55e",   // green
  late:     "#f97316",   // orange
  leave:    "#0ea5e9",   // blue
  holiday:  "#a855f7",   // purple
  absent:   "#e5e7eb",   // light gray
  future:   "transparent",
  off:      "transparent",
};

const STATUS_LABEL: Record<DayStatus, string> = {
  present:  "Present — on time",
  late:     "Present — late",
  leave:    "On approved leave",
  holiday:  "Public holiday",
  absent:   "Absent",
  future:   "",
  off:      "Weekend",
};

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Expand leave date ranges into individual dates
function expandLeaves(leaves: { start_date: string; end_date: string }[]): Set<string> {
  const set = new Set<string>();
  for (const l of leaves) {
    const s = new Date(l.start_date + "T00:00:00Z");
    const e = new Date(l.end_date + "T00:00:00Z");
    let cur = s;
    let safety = 0;
    while (cur <= e && safety++ < 400) {
      set.add(isoDate(cur));
      cur = addDays(cur, 1);
    }
  }
  return set;
}

export default function AttendanceHeatmap({
  attendance,
  leaves,
  holidays,
  today,
}: {
  attendance: { work_date: string; late: boolean }[];
  leaves: { start_date: string; end_date: string }[];
  holidays: string[];
  today: string;
}) {
  // Build lookup maps
  const attMap = new Map<string, boolean>(); // date → late
  for (const a of attendance) attMap.set(a.work_date, a.late);
  const leaveSet = expandLeaves(leaves);
  const holSet = new Set(holidays);

  // Start from previous Sunday, 52 weeks ago (364 days)
  const todayDate = new Date(today + "T00:00:00Z");
  const startDate = addDays(todayDate, -363);
  // Rewind to previous Sunday
  const startSunday = addDays(startDate, -startDate.getUTCDay());

  // Build weeks: array of 7-day arrays
  const weeks: (string | null)[][] = [];
  let cur = startSunday;
  while (cur <= todayDate || weeks.length < 53) {
    const week: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const ds = isoDate(cur);
      week.push(cur <= todayDate ? ds : null);
      cur = addDays(cur, 1);
    }
    weeks.push(week);
    if (cur > addDays(todayDate, 7)) break;
  }

  function getStatus(date: string | null): DayStatus {
    if (!date) return "off";
    if (date > today) return "future";
    const dow = new Date(date + "T00:00:00Z").getUTCDay();
    if (attMap.has(date)) return attMap.get(date) ? "late" : "present";
    if (leaveSet.has(date)) return "leave";
    if (holSet.has(date)) return "holiday";
    if (dow === 0 || dow === 6) return "off"; // weekend
    return "absent";
  }

  // Month labels: find the first cell of each month
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = "";
  weeks.forEach((week, col) => {
    const first = week.find((d) => d !== null);
    if (!first) return;
    const mo = first.slice(0, 7);
    if (mo !== lastMonth) {
      monthLabels.push({ col, label: new Date(first + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" }) });
      lastMonth = mo;
    }
  });

  const CELL = 13;
  const GAP = 3;
  const STEP = CELL + GAP;
  const TOP_OFFSET = 20; // space for month labels
  const LEFT_OFFSET = 28; // space for day labels
  const totalW = weeks.length * STEP - GAP;
  const totalH = 7 * STEP - GAP;

  // Count totals for legend row
  const counts: Record<string, number> = { present: 0, late: 0, leave: 0, holiday: 0, absent: 0 };
  for (const week of weeks) {
    for (const date of week) {
      const s = getStatus(date);
      if (s in counts) counts[s]++;
    }
  }

  return (
    <div className="card">
      <h2>Attendance — last 12 months</h2>
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <svg
          width={LEFT_OFFSET + totalW + 4}
          height={TOP_OFFSET + totalH + 4}
          style={{ display: "block" }}
        >
          {/* Month labels */}
          {monthLabels.map(({ col, label }) => (
            <text
              key={label + col}
              x={LEFT_OFFSET + col * STEP}
              y={TOP_OFFSET - 6}
              fontSize={10}
              style={{ fill: "var(--mute, #9ca3af)" }}
            >
              {label}
            </text>
          ))}

          {/* Day labels (Mon, Wed, Fri) */}
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => (
            (i % 2 === 1) && (
              <text
                key={d}
                x={LEFT_OFFSET - 4}
                y={TOP_OFFSET + i * STEP + CELL - 2}
                fontSize={9}
                textAnchor="end"
                style={{ fill: "var(--mute, #9ca3af)" }}
              >
                {d}
              </text>
            )
          ))}

          {/* Cells */}
          {weeks.map((week, col) =>
            week.map((date, row) => {
              const status = getStatus(date);
              const color = STATUS_COLOR[status];
              const label = date ? `${date}: ${STATUS_LABEL[status] || ""}` : "";
              const x = LEFT_OFFSET + col * STEP;
              const y = TOP_OFFSET + row * STEP;
              return (
                <rect
                  key={`${col}-${row}`}
                  x={x} y={y}
                  width={CELL} height={CELL}
                  rx={3} ry={3}
                  fill={color || "none"}
                  stroke={status === "absent" ? "#d1d5db" : "none"}
                  strokeWidth={status === "absent" ? 1 : 0}
                  opacity={status === "future" || status === "off" ? 0 : 1}
                  style={{ cursor: date ? "default" : "default" }}
                >
                  {label && <title>{label}</title>}
                </rect>
              );
            })
          )}
        </svg>
      </div>

      {/* Legend + stats row */}
      <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 14 }}>
        {(["present", "late", "leave", "holiday", "absent"] as DayStatus[]).map((s) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--mute)" }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_COLOR[s], border: s === "absent" ? "1px solid #d1d5db" : "none", display: "inline-block", flexShrink: 0 }} />
            {STATUS_LABEL[s].split(" — ")[1] ?? STATUS_LABEL[s].split(" — ")[0]}
            <b style={{ color: "var(--ink)", marginLeft: 2 }}>{counts[s]}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
