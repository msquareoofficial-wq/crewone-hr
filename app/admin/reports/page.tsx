// Powered By Vistech Force
import Link from "next/link";

import { requireAdminPage } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import { currentMonth, monthSummary } from "@/lib/hr";
import { fmtDur } from "@/lib/time";
import Shell from "@/components/Shell";
import { EmptyRow } from "@/components/EmptyState";
import { MonthPicker } from "@/components/MonthTable";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";
import CatIcon from "@/components/CatIcon";
import { BREAK_CATS, catKey } from "@/lib/breakcats";
import { getBreakStats } from "@/lib/breaklog";
import "@/components/breaklog.css";

export default async function Reports({ searchParams }: { searchParams: Promise<{ month?: string; dept?: string; cat?: string }> }) {
  const admin = await requireAdminPage("reports");
  const s = await getSettings();
  const sp = await searchParams;
  const month = sp.month && /^[0-9]{4}-[0-9]{2}$/.test(sp.month) ? sp.month : currentMonth(s.timezone);
  const dept = sp.dept === "Sales" || sp.dept === "Production" ? sp.dept : "";
  const users = await q<any>("SELECT id, emp_id, name, department FROM users WHERE role='user' AND active=TRUE " + (dept ? "AND department=$1 " : "") + "ORDER BY department NULLS LAST, name", dept ? [dept] : []);
  const taskCounts = new Map<number, number>((await q<any>("SELECT user_id, COUNT(*)::int AS n FROM tasks WHERE work_date LIKE $1 GROUP BY user_id", [month + "-%"])).map((x: any) => [x.user_id, x.n]));
  const cat = BREAK_CATS.some((c) => c.key === sp.cat) ? (sp.cat as string) : "";
  const bst = await getBreakStats(month, dept);
  const bmap = new Map<string, { n: number; secs: number }>();
  for (const b of bst) { const k = b.user_id + ":" + catKey(b.category); const o = bmap.get(k) || { n: 0, secs: 0 }; o.n += b.n; o.secs += b.secs; bmap.set(k, o); }
  const rows = await Promise.all(users.map(async (u) => ({ u, sum: await monthSummary(u.id, month) })));
  return (
    <Shell user={admin}>
      <h1>Monthly report ({fmtMonth(month)})</h1>
      <div className="card">
        <MonthPicker month={month} extra={<><select name="cat" defaultValue={cat} style={{ width: 160 }}><option value="">All break types</option>{BREAK_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select><select name="dept" defaultValue={dept} style={{ width: 160 }}><option value="">All departments</option><option>Sales</option><option>Production</option></select></>} />
        <div className="row" style={{ marginBottom: 10 }}><div className="spacer" /><a className="btn sec sm" href={`/api/tasklog?month=${month}${dept ? "&dept=" + dept : ""}`}>{dept ? `Task log CSV (${dept})` : "Task log CSV (all users)"}</a><a className="btn sm" style={{ marginLeft: 8 }} href={`/api/reports?month=${month}`}>Download CSV (all users)</a></div>
        <div className="scroll">
          <table>
            <thead><tr><th>User</th><th>Dept</th><th>Present</th><th>Late marks</th><th>Off ({s.lates_per_off} late = 1)</th><th>Breaks</th><th>Break time</th><th>Tasks</th><th>Task time</th></tr></thead>
            <tbody>
              {rows.map(({ u, sum }) => (
                <tr key={u.id}>
                  <td>{admin.role === "admin" ? <Link href={`/admin/users/${u.id}?month=${month}`}>{u.name}</Link> : u.name} <span className="mute">{u.emp_id}</span></td>
                  <td>{u.department ?? "-"}</td><td>{sum.present}</td>
                  <td>{sum.lates ? <span className="badge b-bad">{sum.lates}</span> : 0}</td>
                  <td>{sum.offs}</td><td>{sum.breakCount}</td><td>{fmtDur(sum.breakSeconds)}</td><td>{taskCounts.get(u.id) ?? 0}</td><td>{fmtDur(sum.taskSeconds)}</td>
                </tr>
              ))}
              {!rows.length && <EmptyRow icon="reports" title="No records this month" sub="Data will appear as employees mark attendance." cols={9} />}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="row"><h2 style={{ margin: 0 }}>Breaks by category</h2><div className="spacer" /><a className="btn sec sm" href={`/api/breaklog?month=${month}${dept ? "&dept=" + dept : ""}`}>Break log CSV</a></div>
        <p className="mute">Count and total time per user. Use the break type filter above to focus on one category.</p>
        <div className="scroll">
          <table>
            <thead><tr><th>User</th>{BREAK_CATS.filter((c) => !cat || c.key === cat).map((c) => <th key={c.key}><span className={"bl-c bk-" + c.key}><CatIcon cat={c.key} size={16} />{c.short}</span></th>)}<th>Total</th></tr></thead>
            <tbody>
              {rows.map(({ u }) => {
                const cs = BREAK_CATS.filter((c) => !cat || c.key === cat).map((c) => bmap.get(u.id + ":" + c.key) || { n: 0, secs: 0 });
                const tn = cs.reduce((a, x) => a + x.n, 0), ts = cs.reduce((a, x) => a + x.secs, 0);
                return (
                  <tr key={u.id}>
                    <td>{u.name} <span className="mute">{u.emp_id}</span></td>
                    {cs.map((x, i) => <td key={i}>{x.n ? <>{x.n} <span className="mute">({fmtDur(x.secs)})</span></> : <span className="mute">-</span>}</td>)}
                    <td><b>{tn}</b> <span className="mute">({fmtDur(ts)})</span></td>
                  </tr>
                );
              })}
              {!rows.length && <EmptyRow icon="breaks" title="No break records this month" cols={8} />}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
