// Powered By Vistech Force
import type { DayRow } from "@/lib/hr";
import { fmtTime, fmtDur } from "@/lib/time";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";

export default function MonthTable({ rows, tz }: { rows: DayRow[]; tz: string }) {
  if (!rows.length) return <p className="mute">No records for this month.</p>;
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr><th>Date</th><th>Sign in</th><th>Sign out</th><th>IP</th><th>Status</th><th>Breaks</th><th>Break time</th><th>Tasks</th><th>Task time</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.work_date}>
              <td>{fmtDate(r.work_date)}</td>
              <td>{fmtTime(r.sign_in, tz)}</td>
              <td>{fmtTime(r.sign_out, tz)}{r.auto_out && <> <span className="badge b-warn" title="OUT was not marked, set automatically to the end of the shift">auto</span></>}</td>
              <td>{r.ip}</td>
              <td>{r.late ? <span className="badge b-bad">Late {r.late_minutes}m</span> : <span className="badge b-ok">On time</span>}</td>
              <td>{r.break_count}</td>
              <td>{fmtDur(r.break_seconds)}</td>
              <td>{r.task_count}</td>
              <td>{fmtDur(r.task_seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthStats({ s }: { s: { present: number; lates: number; offs: number; breakCount: number; breakSeconds: number; taskSeconds: number; settings: { grace_minutes: number; lates_per_off: number } } }) {
  const items = [
    ["Present days", s.present],
    ["Late marks", s.lates],
    [`Off count (${s.settings.lates_per_off} late = 1 off)`, s.offs],
    ["Total breaks", s.breakCount],
    ["Break time", fmtDur(s.breakSeconds)],
    ["Task time", fmtDur(s.taskSeconds)],
  ];
  return (
    <div className="grid g4" style={{ marginBottom: 18 }}>
      {items.map(([l, n]) => (
        <div className="stat" key={String(l)}><div className="n">{n}</div><div className="l">{l}</div></div>
      ))}
    </div>
  );
}

export function MonthPicker({ month, extra }: { month: string; extra?: React.ReactNode }) {
  return (
    <form className="row" style={{ marginBottom: 14 }}>
      <input type="month" name="month" defaultValue={month} style={{ width: 180 }} />
      {extra}
      <button className="btn sec sm">Show</button>
    </form>
  );
}
