// Powered By Vistech Force
import Link from "next/link";

export type CalData = {
  month: string; // YYYY-MM
  today: string;
  holidays: Record<string, string>;
  leaves: { start_date: string; end_date: string; status: string }[];
  attendance: Record<string, boolean>; // date -> late?
};

function shift(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default function Calendar({ data, href }: { data: CalData; href: (m: string) => string }) {
  const [y, m] = data.month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const leaveOn = (date: string) => data.leaves.find((l) => l.start_date <= date && date <= l.end_date && l.status !== "rejected");
  const title = first.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <Link className="btn sec sm" href={href(shift(data.month, -1))}>&larr;</Link>
        <b style={{ minWidth: 140, textAlign: "center" }}>{title}</b>
        <Link className="btn sec sm" href={href(shift(data.month, 1))}>&rarr;</Link>
      </div>
      <div className="cal-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="mute" style={{ textAlign: "center", fontSize: 12 }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const date = `${data.month}-${String(d).padStart(2, "0")}`;
          const hol = data.holidays[date];
          const lv = leaveOn(date);
          let cls = "", note = "";
          if (hol) { cls = "hol"; note = hol; }
          else if (lv) { cls = lv.status === "approved" ? "lv" : "lvp"; note = lv.status === "approved" ? "Leave" : "Leave (pending)"; }
          else if (date in data.attendance) { cls = data.attendance[date] ? "late" : "pres"; note = data.attendance[date] ? "Late" : "Present"; }
          return (
            <div key={i} title={note} className={`cal-day ${cls} ${date === data.today ? "today" : ""}`}>
              <b>{d}</b>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note}</div>
            </div>
          );
        })}
      </div>
      <div className="row mute" style={{ marginTop: 10, fontSize: 12 }}>
        <span>🟥 Holiday</span><span>🟩 Leave approved</span><span>🟨 Leave pending</span><span>🟦 Present</span><span>🟧 Late</span>
      </div>
    </div>
  );
}
