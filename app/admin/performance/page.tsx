// Powered By Vistech Force
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { currentMonth } from "@/lib/hr";
import { monthPerformance, BREAK_ALLOWANCE_MIN } from "@/lib/perf";
import Shell, { Avatar } from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";
import { MonthPicker } from "@/components/MonthTable";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";

const cls = (n: number) => (n >= 80 ? "pf-g" : n >= 60 ? "pf-a" : "pf-r");
const Bar = ({ v }: { v: number | null }) => v === null ? <span className="mute">-</span> : (
  <div className="row" style={{ gap: 6 }}><div className="pf-bar" style={{ flex: 1 }}><i className={cls(v)} style={{ width: v + "%" }} /></div><span style={{ fontSize: 12, width: 34 }}>{v}%</span></div>
);

export default async function Performance({ searchParams }: { searchParams: Promise<{ month?: string; dept?: string }> }) {
  const admin = await requireAdminPage("reports");
  const s = await getSettings();
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth(s.timezone);
  const dept = sp.dept === "Sales" || sp.dept === "Production" ? sp.dept : "";
  const rows = await monthPerformance(month, dept);
  const avg = rows.filter((r) => r.overall !== null);
  const teamAvg = avg.length ? Math.round(avg.reduce((a, r) => a + (r.overall as number), 0) / avg.length) : null;
  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: "Performance" }]} />
      <h1>Performance ({fmtMonth(month)})</h1>
      <div className="card">
        <MonthPicker month={month} extra={<select name="dept" defaultValue={dept} style={{ width: 160 }}><option value="">All departments</option><option>Sales</option><option>Production</option></select>} />
        <div className="grid g4" style={{ marginBottom: 6 }}>
          <div className="stat"><div className="n">{rows.length}</div><div className="l">Users</div></div>
          <div className="stat"><div className="n">{teamAvg === null ? "-" : teamAvg + "%"}</div><div className="l">Team average score</div></div>
          <div className="stat"><div className="n">{rows[0]?.overall !== null && rows[0] ? rows[0].name : "-"}</div><div className="l">Top performer</div></div>
        </div>
      </div>
      <div className="card">
        <h2>Overall score chart</h2>
        {rows.map((r) => (
          <div key={r.id} className="pf-row">
            <div className="row" style={{ gap: 8 }}><Avatar src={r.picture} name={r.name} size={30} /><div><div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div><div className="pf-n">{r.designation ?? r.department ?? "-"}</div></div></div>
            <div className="pf-bar" style={{ height: 16 }}>{r.overall !== null && <i className={cls(r.overall)} style={{ width: r.overall + "%" }} />}</div>
            <b>{r.overall === null ? "-" : r.overall + "%"}</b>
          </div>
        ))}
        {!rows.length && <p className="mute">No users.</p>}
      </div>
      <div className="card">
        <h2>Breakdown</h2>
        <div className="scroll">
          <table>
            <thead><tr><th>User</th><th>Attendance (40%)</th><th>Punctuality (20%)</th><th>Tasks (30%)</th><th>Breaks (10%)</th><th>Present / expected</th><th>Late</th><th>Avg break</th><th>Tasks done</th><th>Work hrs</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{admin.role === "admin" ? <Link href={`/admin/users/${r.id}?month=${month}`}>{r.name}</Link> : r.name}<div className="pf-n">{r.designation ?? ""}</div></td>
                  <td style={{ minWidth: 130 }}><Bar v={r.att} /></td><td style={{ minWidth: 130 }}><Bar v={r.punct} /></td><td style={{ minWidth: 130 }}><Bar v={r.task} /></td><td style={{ minWidth: 130 }}><Bar v={r.brk} /></td>
                  <td>{r.present} / {r.expected}</td><td>{r.lates}</td><td>{r.breakAvgMin}m</td><td>{r.taskTotal ? `${r.taskDone} / ${r.taskTotal}` : "-"}</td><td>{r.workHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
          How it is calculated: Attendance = days present / working days so far (Mon to Fri, minus holidays and approved leave). Punctuality = on-time days / present days.
          Tasks = project tasks done / assigned this month. Breaks = full score if average break is up to {BREAK_ALLOWANCE_MIN} min per day, then drops. A missing part (for example no tasks assigned) is left out and the rest are re-weighted.
        </p>
      </div>
    </Shell>
  );
}
