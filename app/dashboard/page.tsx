// Powered By Vistech Force
import { requireUser } from "@/lib/auth";
import TaskLog from "@/components/TaskLog";
import BreakLog from "@/components/BreakLog";
import CatIcon from "@/components/CatIcon";
import { catLabel } from "@/lib/breakcats";
import { getBreakLog } from "@/lib/breaklog";
import "@/components/breaklog.css";
import { getTaskLog } from "@/lib/tasklog";
import { q, q1, getSettings } from "@/lib/db";
import { currentMonth, monthSummary, todayDate } from "@/lib/hr";
import { fmtTime, fmtDur, fmt12, localParts } from "@/lib/time";
import { autoCloseStale, pendingMissedOut } from "@/lib/missedout";
import MissedOutPrompt from "@/components/MissedOutPrompt";
import Shell from "@/components/Shell";
import MonthTable, { MonthStats, MonthPicker } from "@/components/MonthTable";
import UserPanel from "./UserPanel";
import ProfileForm from "./ProfileForm";
import AutoRefresh from "@/components/AutoRefresh";
import { redirect } from "next/navigation";
import Feed from "@/components/Feed";
import Calendar from "@/components/Calendar";
import LeaveForm from "./LeaveForm";
import CorrectionForm from "./CorrectionForm";
import { leaveUsed } from "@/lib/leave";
import MyLeaves from "./MyLeaves";
import AttendanceButtons from "./AttendanceButtons";
import { getNotifications } from "@/lib/hr";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ month?: string; cal?: string }> }) {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");
  const s = await getSettings();
  const sp = await searchParams;
  const month = sp.month && /^[0-9]{4}-[0-9]{2}$/.test(sp.month) ? sp.month : currentMonth(s.timezone);
  const today = await todayDate();
  await autoCloseStale(user.id);
  const miss = await pendingMissedOut(user.id, today);
  const hhmm = (m: number) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const missHHMM = miss ? (miss.sign_out ? hhmm(localParts(new Date(miss.sign_out), s.timezone).minutes) : miss.shift_end) : "";
  const att = await q1<any>("SELECT * FROM attendance WHERE user_id=$1 AND work_date=$2", [user.id, today]);
  const openBreak = await q1<any>("SELECT start_at, category FROM breaks WHERE user_id=$1 AND end_at IS NULL ORDER BY id DESC LIMIT 1", [user.id]);
  const openTask = await q1<any>("SELECT title, start_at FROM tasks WHERE user_id=$1 AND end_at IS NULL ORDER BY id DESC LIMIT 1", [user.id]);
  const todayTasks = await q<any>(
    "SELECT title, start_at, end_at, EXTRACT(EPOCH FROM (COALESCE(end_at, now()) - start_at))::int AS secs FROM tasks WHERE user_id=$1 AND work_date=$2 ORDER BY id DESC",
    [user.id, today]
  );
  const todayBreaks = await q<any>(
    "SELECT category, start_at, end_at, EXTRACT(EPOCH FROM (COALESCE(end_at, now()) - start_at))::int AS secs FROM breaks WHERE user_id=$1 AND work_date=$2 ORDER BY id DESC",
    [user.id, today]
  );
  const sum = await monthSummary(user.id, month);
  const cal = sp.cal && /^[0-9]{4}-[0-9]{2}$/.test(sp.cal) ? sp.cal : today.slice(0, 7);
  const me2 = await q1<any>("SELECT department FROM users WHERE id=$1", [user.id]);
  const notifs = await getNotifications({ role: "user", department: me2?.department ?? null });
  const hols = await q<any>("SELECT holiday_date, title FROM holidays WHERE holiday_date LIKE $1", [cal + "-%"]);
  const myLeaves = await q<any>("SELECT * FROM leave_requests WHERE user_id=$1 ORDER BY start_date DESC LIMIT 30", [user.id]);
  const calAtt = await q<any>("SELECT work_date, late FROM attendance WHERE user_id=$1 AND work_date LIKE $2", [user.id, cal + "-%"]);
  const me = await q1<any>("SELECT phone FROM users WHERE id=$1", [user.id]);
  const used = await leaveUsed(user.id, today.slice(0, 4));
  const left = Math.max(0, s.leave_quota - used);
  const corrs = await q<any>("SELECT id, work_date, req_in, req_out, status, admin_note FROM attendance_corrections WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10", [user.id]);

  return (
    <Shell user={user}>
      <AutoRefresh seconds={60} />
      <h1>Welcome, {user.name}</h1>
      <div className="grid g2">
        <div className="card">
          <h2>Today's attendance ({fmtDate(today)})</h2>
          <div className="row">
            <div><div className="mute">Sign in</div><div className="big">{fmtTime(att?.sign_in, s.timezone)}</div></div>
            <div><div className="mute">Sign out</div><div className="big">{fmtTime(att?.sign_out, s.timezone)}</div></div>
            <div className="spacer" />
            <div>
              {!att ? <span className="badge b-mute">Not marked</span> : att.late ? <span className="badge b-bad">Late by {att.late_minutes} min</span> : <span className="badge b-ok">On time</span>}
              <div className="mute" style={{ marginTop: 6 }}>IP: {att?.ip ?? "-"}</div>
              <div className="mute">Shift: {fmt12(user.shift_start)} to {fmt12(user.shift_end)}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>{miss && !att ? <MissedOutPrompt workDate={miss.work_date} dateLabel={fmtDate(miss.work_date)} autoTime={fmt12(missHHMM)} autoHHMM={missHHMM} /> : <AttendanceButtons state={!att ? "none" : att.sign_out ? "out" : "in"} canUndo={!!att?.sign_out && Date.now() - new Date(att.sign_out).getTime() <= 10 * 60 * 1000} />}</div>
        </div>
        {att && !att.sign_out ? (
          <UserPanel onBreak={!!openBreak} breakSince={openBreak?.start_at ?? null} breakCat={openBreak?.category ?? null} task={openTask ? { title: openTask.title, since: openTask.start_at } : null} />
        ) : (
          <div className="card"><h2>Task and Break</h2><p className="mute">{att ? "You are OUT for today." : "Click IN first to start tasks and breaks."}</p></div>
        )}
      </div>

      <div className="card">
        <h2>Notifications</h2>
        <Feed items={notifs} tz={s.timezone} meId={user.id} />
      </div>

      <MonthStats s={sum} />

      <div className="grid g2">
        <div className="card">
          <h2>Today's tasks</h2>
          {todayTasks.length ? (
            <div className="scroll"><table><thead><tr><th>Task</th><th>Start</th><th>End</th><th>Time</th></tr></thead><tbody>
              {todayTasks.map((t, i) => (<tr key={i}><td>{t.title}</td><td>{fmtTime(t.start_at, s.timezone)}</td><td>{t.end_at ? fmtTime(t.end_at, s.timezone) : <span className="badge b-info">Running</span>}</td><td>{fmtDur(t.secs)}</td></tr>))}
            </tbody></table></div>
          ) : <p className="mute">No tasks yet.</p>}
        </div>
        <div className="card">
          <h2>Today's breaks ({todayBreaks.length})</h2>
          {todayBreaks.length ? (
            <div className="scroll"><table><thead><tr><th>Type</th><th>Start</th><th>Back</th><th>Duration</th></tr></thead><tbody>
              {todayBreaks.map((b, i) => (<tr key={i}><td><span className="bl-c"><CatIcon cat={b.category} size={16} />{catLabel(b.category)}</span></td><td>{fmtTime(b.start_at, s.timezone)}</td><td>{b.end_at ? fmtTime(b.end_at, s.timezone) : <span className="badge b-warn">On break</span>}</td><td>{fmtDur(b.secs)}</td></tr>))}
            </tbody></table></div>
          ) : <p className="mute">No breaks taken today.</p>}
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <h2>Calendar</h2>
          <Calendar
            data={{ month: cal, today, holidays: Object.fromEntries(hols.map((h: any) => [h.holiday_date, h.title])), leaves: myLeaves, attendance: Object.fromEntries(calAtt.map((a: any) => [a.work_date, a.late])) }}
            href={(m) => `/dashboard?cal=${m}&month=${month}`}
          />
        </div>
        <div className="card">
          <h2>Apply for leave / off</h2>
          <p className="mute" style={{ marginTop: 0 }}>Leave balance {today.slice(0, 4)}: <b style={{ color: left === 0 ? "var(--bad)" : "var(--ok)" }}>{left}</b> of {s.leave_quota} days left ({used} used)</p>
          <LeaveForm today={today} />
          <h2 style={{ marginTop: 18 }}>My leave requests</h2>
          <MyLeaves leaves={myLeaves} />
        </div>
      </div>

      <div className="card">
        <h2>Forgot to mark IN or OUT?</h2>
        <CorrectionForm today={today} items={corrs} />
      </div>

      <div className="card">
        <div className="row"><h2 style={{ margin: 0 }}>Monthly record</h2><div className="spacer" /><a className="btn sec sm" href={`/api/reports?month=${month}`}>Download CSV</a></div>
        <MonthPicker month={month} />
        <MonthTable rows={sum.rows} tz={s.timezone} />
      </div>

      <BreakLog rows={await getBreakLog(user.id, month)} tz={s.timezone} csvHref={`/api/breaklog?month=${month}`} title={`My break log (${month})`} />
      <TaskLog rows={await getTaskLog(user.id, month)} tz={s.timezone} csvHref={`/api/tasklog?month=${month}`} title={`My task log (${month})`} />

      <ProfileForm user={{ pseudo_name: user.pseudo_name, picture: user.picture, phone: me?.phone ?? null }} />
    </Shell>
  );
}
