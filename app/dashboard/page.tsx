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
import { leaveBalance } from "@/lib/leave";
import LeaveBalance from "@/components/LeaveBalance";
import MyLeaves from "./MyLeaves";
import DashboardCharts from "@/components/DashboardCharts";
import AttendanceHeatmap from "@/components/AttendanceHeatmap";
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
  // Night shift: open record from a previous day (not auto-closed)
  const nightAtt = !att ? await q1<any>(
    "SELECT * FROM attendance WHERE user_id=$1 AND sign_out IS NULL AND auto_out=FALSE AND work_date < $2 ORDER BY work_date DESC LIMIT 1",
    [user.id, today]
  ) : null;
  // Active record = today's OR night shift from previous day
  const activeAtt = att ?? nightAtt;
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
  const me = await q1<any>("SELECT phone, leave_quota FROM users WHERE id=$1", [user.id]);
  const bal = await leaveBalance(user.id, today.slice(0, 4), s.leave_quota, me?.leave_quota);
  const corrs = await q<any>("SELECT id, work_date, req_in, req_out, status, admin_note FROM attendance_corrections WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10", [user.id]);
  // Heatmap: last 364 days attendance + leaves + holidays
  const heatAtt = await q<{ work_date: string; late: boolean }>(
    "SELECT work_date, late FROM attendance WHERE user_id=$1 AND work_date >= (CURRENT_DATE - INTERVAL '364 days')::text ORDER BY work_date",
    [user.id]
  );
  const heatLeaves = await q<{ start_date: string; end_date: string }>(
    "SELECT start_date, end_date FROM leave_requests WHERE user_id=$1 AND status='approved' AND end_date >= (CURRENT_DATE - INTERVAL '364 days')::text",
    [user.id]
  );
  const heatHols = await q<{ holiday_date: string }>(
    "SELECT holiday_date FROM holidays WHERE holiday_date >= (CURRENT_DATE - INTERVAL '364 days')::text",
    []
  );

  const trend = await q<{ month: string; present: number; late_count: number }>(
    `SELECT TO_CHAR(work_date::date, 'YYYY-MM') AS month,
       COUNT(*)::int AS present,
       COUNT(*) FILTER (WHERE late)::int AS late_count
     FROM attendance WHERE user_id=$1 AND work_date::date >= CURRENT_DATE - INTERVAL '5 months'
     GROUP BY month ORDER BY month`,
    [user.id]
  );
  // Punches: today's, or if night shift active, the night shift date's punches
  const punchDate = activeAtt?.work_date ?? today;
  const todayPunches = await q<any>("SELECT punch_type, punched_at FROM attendance_punches WHERE user_id=$1 AND work_date=$2 ORDER BY id ASC", [user.id, punchDate]);
  // Only show missed-out prompt if there's no active night shift in progress
  const showMiss = miss && !att && !nightAtt;

  return (
    <Shell user={user}>
      <AutoRefresh seconds={60} />
      <h1>Welcome, {user.name}</h1>
      <div className="grid g2">
        <div className="card">
          <h2>Today's attendance ({fmtDate(today)})</h2>
          <div className="row">
            <div><div className="mute">Sign in</div><div className="big">{fmtTime(activeAtt?.sign_in, s.timezone)}</div></div>
            <div><div className="mute">Sign out</div><div className="big">{fmtTime(activeAtt?.sign_out, s.timezone)}</div></div>
            <div className="spacer" />
            <div>
              {!activeAtt ? <span className="badge b-mute">Not marked</span> : activeAtt.late ? <span className="badge b-bad">Late by {activeAtt.late_minutes} min</span> : <span className="badge b-ok">On time</span>}
              {nightAtt && <div className="mute" style={{ marginTop: 4 }}>Night shift from {fmtDate(nightAtt.work_date)}</div>}
              <div className="mute" style={{ marginTop: 6 }}>IP: {activeAtt?.ip ?? "-"}</div>
              <div className="mute">Shift: {fmt12(user.shift_start)} to {fmt12(user.shift_end)}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>{showMiss ? <MissedOutPrompt workDate={miss.work_date} dateLabel={fmtDate(miss.work_date)} autoTime={fmt12(missHHMM)} autoHHMM={missHHMM} /> : <AttendanceButtons state={!activeAtt ? "none" : activeAtt.sign_out ? "out" : "in"} canUndo={!!att?.sign_out && Date.now() - new Date(att.sign_out).getTime() <= 10 * 60 * 1000} punches={todayPunches.map((p: any) => ({ type: p.punch_type, at: p.punched_at }))} tz={s.timezone} />}</div>
        </div>
        {activeAtt && !activeAtt.sign_out ? (
          <UserPanel onBreak={!!openBreak} breakSince={openBreak?.start_at ?? null} breakCat={openBreak?.category ?? null} task={openTask ? { title: openTask.title, since: openTask.start_at } : null} />
        ) : (
          <div className="card"><h2>Task and Break</h2><p className="mute">{activeAtt ? "You are OUT for today." : "Click IN first to start tasks and breaks."}</p></div>
        )}
      </div>

      <div className="card">
        <h2>Notifications</h2>
        <Feed items={notifs} tz={s.timezone} meId={user.id} />
      </div>

      <MonthStats s={sum} />

      <DashboardCharts trend={trend} monthRows={sum.rows} month={month} />

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
          <LeaveBalance used={bal.used} quota={bal.quota} left={bal.left} year={today.slice(0, 4)} />
          <LeaveForm today={today} />
          <h2 style={{ marginTop: 18 }}>My leave requests</h2>
          <MyLeaves leaves={myLeaves} />
        </div>
      </div>

      <div className="card">
        <h2>Forgot to mark IN or OUT?</h2>
        <CorrectionForm today={today} items={corrs} />
      </div>

      <AttendanceHeatmap
        attendance={heatAtt}
        leaves={heatLeaves}
        holidays={heatHols.map((h) => h.holiday_date)}
        today={today}
      />

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
