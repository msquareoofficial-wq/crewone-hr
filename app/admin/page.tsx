// Powered By Vistech Force
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Admin Dashboard" };
import { requireAdminPage } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import { adminToday, todayDate } from "@/lib/hr";
import { fmtTime, fmtDur, fmt12, localParts, hhmmToMinutes } from "@/lib/time";
import { adminMissedOut } from "@/lib/missedout";
import MissedOutCard from "@/components/MissedOutCard";
import Shell, { Avatar } from "@/components/Shell";
import AutoRefresh from "@/components/AutoRefresh";
import BreakTimer from "@/components/BreakTimer";
import CatIcon from "@/components/CatIcon";
import { catLabel } from "@/lib/breakcats";
import Link from "next/link";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";
import { EmptyRow } from "@/components/EmptyState";

export default async function AdminHome() {
  const admin = await requireAdminPage("dashboard");
  const s = await getSettings();
  const date = await todayDate();
  const rows = await adminToday(date);
  const missed = await adminMissedOut(date);
  const hh = (m: number) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const missedItems = missed.map((m: any) => ({ id: m.id, name: m.name, emp_id: m.emp_id, dateLabel: fmtDate(m.work_date), signIn: fmtTime(m.sign_in, s.timezone), open: !m.sign_out, outLabel: m.sign_out ? fmt12(hh(localParts(new Date(m.sign_out), s.timezone).minutes)) : "", hhmm: m.sign_out ? hh(localParts(new Date(m.sign_out), s.timezone).minutes) : m.shift_end }));
  const presentRows0 = rows.filter((r) => r.sign_in && !r.sign_out);
  const present = presentRows0.length;
  const late = rows.filter((r) => r.late).length;
  const onBreak = rows.filter((r) => r.on_break).length;
  const absentRows = rows.filter((r) => !r.sign_in && r.shift_type !== "hybrid");
  const absent = absentRows.length;
  const pct = rows.length ? Math.round((present / rows.length) * 100) : 0;
  const isAdmin = admin.role === "admin";
  const monthDays = await q<any>("SELECT user_id, COUNT(*)::int AS n FROM attendance WHERE work_date LIKE $1 GROUP BY user_id", [date.slice(0, 7) + "-%"]);
  const mdays = new Map<number, number>(monthDays.map((m: any) => [m.user_id, m.n]));
  const onLeave = new Set<number>((await q<any>("SELECT user_id FROM leave_requests WHERE status='approved' AND start_date <= $1 AND end_date >= $1", [date])).map((l: any) => l.user_id));
  const nowMin = localParts(new Date(), s.timezone).minutes;
  const isHoliday = !!(await q<any>("SELECT 1 FROM holidays WHERE holiday_date=$1", [date])).length;
  // not IN, not on leave, and the shift started more than the grace period ago (same-day shifts only)
  const overdue = isHoliday ? [] : rows.filter((r) => !r.sign_in && r.shift_type !== "hybrid" && !onLeave.has(r.id) && hhmmToMinutes(r.shift_start) <= hhmmToMinutes(r.shift_end) && nowMin >= hhmmToMinutes(r.shift_start) + s.grace_minutes && nowMin <= hhmmToMinutes(r.shift_end));
  const presentRows = presentRows0;
  const openBreaks = await q<any>("SELECT DISTINCT ON (user_id) user_id, start_at, category FROM breaks WHERE end_at IS NULL ORDER BY user_id, start_at DESC");
  const breakBy = new Map<number, any>(openBreaks.map((b: any) => [b.user_id, b]));
  const onBreakRows = rows.filter((r) => breakBy.has(r.id)).sort((x, y) => +new Date(breakBy.get(x.id).start_at) - +new Date(breakBy.get(y.id).start_at));
  const overdueIds = new Set<number>(overdue.map((r) => r.id));
  const sortedPresent = [...presentRows].sort((x, y) => Number(!!x.late) - Number(!!y.late));
  const presentPerson = (r: any) => (
    <div key={r.id} className="pp-row" title={`${r.name} (${r.emp_id})`}>
      <span className="pp-av"><Avatar src={r.picture} name={r.name} size={40} /><i className="pp-dot ok" /></span>
      <div className="pp-txt">
        <div className="pp-name">{r.name}</div>
        <div className="pp-sub">In {fmt12(hh(localParts(new Date(r.sign_in), s.timezone).minutes))}</div>
        {r.late && <div className="pp-late">Late{r.late_minutes ? ` ${r.late_minutes} min` : ""}</div>}
      </div>
    </div>
  );
  const absentPerson = (r: any) => (
    <div key={r.id} className="pp-row" title={`${r.name} (${r.emp_id})`}>
      <span className="pp-av"><Avatar src={r.picture} name={r.name} size={40} /><i className="pp-dot bad" /></span>
      <div className="pp-txt">
        <div className="pp-name">{r.name}</div>
        {onLeave.has(r.id) ? <div className="pp-sub">On leave</div> : overdueIds.has(r.id) ? <div className="pp-late">Not in yet, shift {fmt12(r.shift_start)}</div> : <div className="pp-sub">Shift {fmt12(r.shift_start)}</div>}
      </div>
    </div>
  );

  const status = (r: any) => {
    if (!r.sign_in) return <span className="badge b-mute">Not in</span>;
    if (r.sign_out) return <span className="badge b-mute">Signed out</span>;
    if (r.on_break) return <span className="badge b-warn">On break</span>;
    if (r.current_task) return <span className="badge b-info">Working</span>;
    return <span className="badge b-ok">Online</span>;
  };

  return (
    <Shell user={admin}>
      <AutoRefresh seconds={30} />
      <h1>Dashboard ({fmtDate(date)})</h1>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="n" style={{ color: "var(--ok)" }}>{present}</div><div className="l">Present</div></div>
        <div className="stat"><div className="n" style={{ color: "var(--bad)" }}>{absent}</div><div className="l">Absent</div></div>
        <div className="stat"><div className="n" style={{ color: late ? "var(--warn)" : undefined }}>{late}</div><div className="l">Late (counted in present)</div></div>
        <div className="stat"><div className="n">{pct}%</div><div className="l">Attendance ({present}/{rows.length})</div></div>
      </div>
      {missedItems.length > 0 && <MissedOutCard items={missedItems} />}
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h2><span className="dot-ok" /> Present ({present})</h2>
          <div className="pp-list">{sortedPresent.map(presentPerson)}{!presentRows.length && <span className="mute">Nobody has signed in yet.</span>}</div>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <h2><span className="dot-bad" /> Absent ({absent})</h2>
          <div className="pp-list">{absentRows.map(absentPerson)}{!absentRows.length && <span className="mute">Everyone is present.</span>}</div>
        </div>
      </div>
      <div className="card">
        <h2><span className="dot-warn" /> On break now ({onBreakRows.length})</h2>
        <div className="bk-list">
          {onBreakRows.map((r) => {
            const b = breakBy.get(r.id);
            return (
              <div key={r.id} className="pp-row bk-row" title={`${r.name} (${r.emp_id})`}>
                <span className="pp-av"><Avatar src={r.picture} name={r.name} size={40} /><i className="pp-dot warn" /></span>
                <div className="pp-txt">
                  <div className="pp-name">{r.name}</div>
                  <div className="bk-reason"><CatIcon cat={b.category} size={14} /> {catLabel(b.category)}</div>
                </div>
                <BreakTimer start={new Date(b.start_at).toISOString()} />
              </div>
            );
          })}
          {!onBreakRows.length && <span className="mute">Nobody is on break right now.</span>}
        </div>
      </div>
      <div className="card">
        <h2>Today's details for all users</h2>
        <div className="scroll">
          <table>
            <thead><tr><th>User</th><th>Dept</th><th>Shift</th><th>Status</th><th>Sign in</th><th>IP</th><th>Late</th><th>Breaks</th><th>Break time</th><th>Current task</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ verticalAlign: "middle" }}>
                  <td><div className="row"><Avatar src={r.picture} name={r.name} online={!!r.sign_in && !r.sign_out} />{isAdmin ? <Link href={`/admin/users/${r.id}`}>{r.name}</Link> : <span>{r.name}</span>}<span className="mute">{r.emp_id}</span></div></td>
                  <td>{r.department ?? "-"}</td>
                  <td>{r.shift_type === "hybrid" ? <span className="badge b-info">Hybrid</span> : `${fmt12(r.shift_start)} - ${fmt12(r.shift_end)}`}</td>
                  <td>{status(r)}</td>
                  <td>{fmtTime(r.sign_in, s.timezone)}</td>
                  <td>{r.ip ?? "-"}</td>
                  <td>{r.sign_in ? (r.late ? <span className="badge b-bad">{r.late_minutes}m late</span> : <span className="badge b-ok">No</span>) : "-"}</td>
                  <td>{r.break_count}</td>
                  <td>{fmtDur(r.break_seconds)}</td>
                  <td><span title={r.current_task ?? undefined} style={{ display: "inline-block", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle", cursor: r.current_task ? "default" : undefined }}>{r.current_task ?? "-"}</span></td>
                </tr>
              ))}
              {!rows.length && <EmptyRow icon="users" title="No employees yet" sub="Go to the Users page to add your first employee." cols={10} />}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
