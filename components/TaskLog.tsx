// Powered By Vistech Force
import { fmtDur } from "@/lib/time";
import { fmtDate } from "@/lib/fmtdate";
import type { TaskLogRow } from "@/lib/tasklog";
import "./tasklog.css";
import EmptyState from "./EmptyState";

const hm = (d: string | Date, tz: string) => new Date(d).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });

export default function TaskLog({ rows, tz, csvHref, title }: { rows: TaskLogRow[]; tz: string; csvHref: string; title?: string }) {
  const days: { date: string; items: TaskLogRow[]; secs: number }[] = [];
  for (const r of rows) {
    let d = days[days.length - 1];
    if (!d || d.date !== r.work_date) { d = { date: r.work_date, items: [], secs: 0 }; days.push(d); }
    d.items.push(r);
    d.secs += r.secs;
  }
  const total = rows.reduce((a, r) => a + r.secs, 0);
  const maxDay = Math.max(1, ...days.map((d) => d.secs));
  const avg = days.length ? total / days.length : 0;
  const stats: [string, string][] = [
    ["Tasks", String(rows.length)],
    ["Days with tasks", String(days.length)],
    ["Total time", fmtDur(total)],
    ["Average per day", fmtDur(avg)],
  ];
  return (
    <div className="card">
      <div className="tl-head">
        <h2>{title || "Task log"}</h2>
        <div className="spacer" />
        <a className="btn sec sm" href={csvHref}>Download CSV</a>
      </div>
      <div className="tl-stats">
        {stats.map(([l, v]) => (<div className="tl-stat" key={l}><b>{v}</b><span>{l}</span></div>))}
      </div>
      {days.length ? (
        <div className="tl-days">
          {days.map((d) => (
            <div className="tl-day" key={d.date}>
              <div className="tl-dh">
                <span className="tl-date">{fmtDate(d.date)}</span>
                <span className="tl-chip">{d.items.length} task{d.items.length === 1 ? "" : "s"}</span>
                <span className="tl-bar"><i style={{ width: Math.max(4, Math.round((d.secs / maxDay) * 100)) + "%" }} /></span>
                <span className="tl-dt">{fmtDur(d.secs)}</span>
              </div>
              {d.items.map((t, i) => (
                <div className="tl-row" key={d.date + i}>
                  <span className={t.end_at ? "tl-dot" : "tl-dot run"} />
                  <span className="tl-title">{t.title}</span>
                  <span className="tl-range">{hm(t.start_at, tz)} - {t.end_at ? hm(t.end_at, tz) : "running"}</span>
                  <span className="tl-dur">{fmtDur(t.secs)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : <EmptyState icon="tasks" title="No tasks this month" sub="Tasks you work on will be listed here." compact />}
    </div>
  );
}
