// Powered By Vistech Force
import Link from "next/link";

export type CalEvent = { date: string; label: string; kind: "hol" | "leave" | "leavep" | "task" | "late" | "pres" };

function shift(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export default function BigCalendar({ month, today, events }: { month: string; today: string; events: CalEvent[] }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const title = first.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const byDate = new Map<string, CalEvent[]>();
  for (const e of events) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <Link className="btn sec sm" href={`/calendar?m=${shift(month, -1)}`}>&larr;</Link>
        <b style={{ minWidth: 160, textAlign: "center", fontSize: 16 }}>{title}</b>
        <Link className="btn sec sm" href={`/calendar?m=${shift(month, 1)}`}>&rarr;</Link>
        <Link className="btn sec sm" href="/calendar">Today</Link>
      </div>
      <div className="bigcal">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="wd">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="day off" />;
          const date = `${month}-${String(d).padStart(2, "0")}`;
          const ev = byDate.get(date) ?? [];
          return (
            <div key={i} className={"day" + (date === today ? " today" : "")}>
              <div className="dn">{d}</div>
              {ev.slice(0, 4).map((e, j) => <div key={j} className={"cev " + e.kind} title={e.label}>{e.label}</div>)}
              {ev.length > 4 && <div className="mute" style={{ fontSize: 11 }}>+{ev.length - 4} more</div>}
            </div>
          );
        })}
      </div>
      <div className="row mute" style={{ marginTop: 12, fontSize: 12 }}>
        <span className="cev hol">Holiday</span><span className="cev leave">Leave</span><span className="cev leavep">Leave (pending)</span><span className="cev task">Task due</span><span className="cev pres">Present</span><span className="cev late">Late</span>
      </div>
    </div>
  );
}
