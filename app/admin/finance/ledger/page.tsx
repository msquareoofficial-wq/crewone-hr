// Powered By Vistech Force
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { currentMonth } from "@/lib/hr";
import { buildLedger, clampRange, shiftMonth, lineDue } from "@/lib/finance";
import { fmtMonth, fmtDate } from "@/lib/fmtdate";
import Shell from "@/components/Shell";

const fmt = (n: number) => (n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
type SP = { from?: string; to?: string; emp?: string; status?: string };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireAdminPage();
  const s = await getSettings();
  const cur = currentMonth(s.timezone);
  const sp = await searchParams;
  const { from, to } = clampRange(sp.from, sp.to, cur);
  const emp = (sp.emp || "").trim().toLowerCase();
  const status = sp.status === "paid" || sp.status === "pending" ? sp.status : "all";
  const L = await buildLedger(from, to, emp, status);
  const qs = (o: Partial<SP>) => {
    const p = new URLSearchParams();
    const v = { from, to, emp, status, ...o } as Record<string, string>;
    Object.keys(v).forEach((k) => { if (v[k] && !(k === "status" && v[k] === "all")) p.set(k, v[k]); });
    return "?" + p.toString();
  };
  const presets = [[1, "This month"], [2, "2 months"], [3, "3 months"], [6, "6 months"], [12, "12 months"]] as const;
  const personRows = L.staff.slice().sort((a, b) => a.month.localeCompare(b.month));
  const tDue = L.people.reduce((a, p) => a + p.due, 0), tPaid = L.people.reduce((a, p) => a + p.paid, 0);
  const co = L.monthly.reduce((a, m) => ({ salary: a.salary + m.salary, comm: a.comm + m.comm, exp: a.exp + m.exp, spend: a.spend + m.spend, total: a.total + m.total, paid: a.paid + m.paid, pending: a.pending + m.pending }), { salary: 0, comm: 0, exp: 0, spend: 0, total: 0, paid: 0, pending: 0 });
  let bal = 0;
  return (
    <Shell user={admin}>
      <div className="row" style={{ marginBottom: 6 }}><h1 style={{ margin: 0 }}>Finance ledger</h1><div className="spacer" /><Link className="btn sec" href={`/admin/finance?month=${to}`}>Back to Finance</Link></div>
      <div className="card lg-filter">
        <div className="lg-presets">
          {presets.map(([n, label]) => <Link key={n} className={"btn sm " + (from === shiftMonth(cur, -(n - 1)) && to === cur ? "" : "sec")} href={qs({ from: shiftMonth(cur, -(n - 1)), to: cur })}>{label}</Link>)}
        </div>
        <form method="get" className="lg-form">
          <label>From<input type="month" name="from" defaultValue={from} max={cur} /></label>
          <label>To<input type="month" name="to" defaultValue={to} max={cur} /></label>
          <label>Employee
            <select name="emp" defaultValue={emp}><option value="">All employees</option>{L.names.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
          </label>
          <label>Status
            <select name="status" defaultValue={status}><option value="all">All</option><option value="paid">Paid only</option><option value="pending">Pending only</option></select>
          </label>
          <button className="btn">Show ledger</button>
          <a className="btn sec" href={"/api/admin/finance/ledger" + qs({})}>Download CSV</a>
        </form>
        <p className="mute" style={{ margin: "10px 0 0" }}>{fmtMonth(from)} to {fmtMonth(to)}. A month appears only after it was opened once in Finance.</p>
      </div>

      <div className="fin-tiles lg-tiles">
        <div className="stat"><div className="n">{fmt(emp ? tDue : co.total)}</div><div className="l">{emp ? "Total due (salary + commission)" : "Total (all sections)"}</div></div>
        <div className="stat"><div className="n" style={{ color: "var(--ok)" }}>{fmt(emp ? tPaid : co.paid)}</div><div className="l">Paid</div></div>
        <div className="stat"><div className="n" style={{ color: (emp ? tDue - tPaid : co.pending) ? "var(--bad)" : undefined }}>{fmt(emp ? tDue - tPaid : co.pending)}</div><div className="l">Pending</div></div>
      </div>

      {emp ? (
        <div className="card">
          <h2>{L.people[0] ? L.people[0].name : "Employee"} <span className="mute" style={{ fontWeight: 400 }}>{L.people[0] && L.people[0].dept ? "(" + L.people[0].dept + ")" : ""}</span></h2>
          <div className="scroll"><table className="fin-t lg-t">
            <thead><tr><th>Month</th><th className="r">Salary</th><th className="r">Commission</th><th className="r">Total pay</th><th>Status</th><th>Paid on</th><th className="r">Pending balance</th></tr></thead>
            <tbody>
              {personRows.map((r) => { const d = lineDue(r); bal += r.paid ? 0 : d; return (
                <tr key={r.id}><td><Link href={`/admin/finance?month=${r.month}`}>{fmtMonth(r.month)}</Link></td><td className="r">{fmt(r.amount)}</td><td className="r">{fmt(r.commission)}</td><td className="r"><b>{fmt(d)}</b></td>
                  <td><span className={"fin-pay static" + (r.paid ? " on" : "")}>{r.paid ? "Paid" : "Pending"}</span></td><td>{r.paid_on ? fmtDate(r.paid_on) : "-"}</td><td className="r">{fmt(bal)}</td></tr>
              ); })}
              {!personRows.length && <tr><td colSpan={7} className="mute">No lines for this employee in the chosen range.</td></tr>}
              <tr className="fin-total"><td>Total</td><td className="r">{fmt(personRows.reduce((a, r) => a + r.amount, 0))}</td><td className="r">{fmt(personRows.reduce((a, r) => a + r.commission, 0))}</td><td className="r">{fmt(tDue)}</td><td colSpan={2}>Paid {fmt(tPaid)}</td><td className="r">{fmt(tDue - tPaid)}</td></tr>
            </tbody>
          </table></div>
        </div>
      ) : (
        <div className="card">
          <h2>Staff ledger</h2>
          <div className="scroll"><table className="fin-t lg-t">
            <thead><tr><th>Employee</th><th>Department</th><th className="r">Months</th><th className="r">Total due</th><th className="r">Paid</th><th className="r">Pending</th></tr></thead>
            <tbody>
              {L.people.map((p) => (
                <tr key={p.key}><td><Link href={qs({ emp: p.key })}>{p.name}</Link></td><td>{p.dept || "-"}</td><td className="r">{p.months}</td><td className="r">{fmt(p.due)}</td><td className="r">{fmt(p.paid)}</td><td className="r">{p.due - p.paid ? <b style={{ color: "var(--bad)" }}>{fmt(p.due - p.paid)}</b> : fmt(0)}</td></tr>
              ))}
              {!L.people.length && <tr><td colSpan={6} className="mute">No salary lines in the chosen range.</td></tr>}
              <tr className="fin-total"><td>Total</td><td></td><td></td><td className="r">{fmt(tDue)}</td><td className="r">{fmt(tPaid)}</td><td className="r">{fmt(tDue - tPaid)}</td></tr>
            </tbody>
          </table></div>
          <p className="mute" style={{ margin: "8px 0 0" }}>Click a name to see that person month by month.</p>
        </div>
      )}

      {!emp && (
        <div className="card">
          <h2>Month by month (company)</h2>
          <div className="scroll"><table className="fin-t lg-t lg-t2">
            <thead><tr><th>Month</th><th className="r">Salaries</th><th className="r">Commission</th><th className="r">Office expense</th><th className="r">Spending</th><th className="r">Total</th><th className="r">Paid</th><th className="r">Pending</th></tr></thead>
            <tbody>
              {L.monthly.map((m) => (
                <tr key={m.month} className={m.rows ? "" : "mute"}><td><Link href={`/admin/finance?month=${m.month}`}>{fmtMonth(m.month)}</Link></td><td className="r">{fmt(m.salary)}</td><td className="r">{fmt(m.comm)}</td><td className="r">{fmt(m.exp)}</td><td className="r">{fmt(m.spend)}</td><td className="r"><b>{fmt(m.total)}</b></td><td className="r">{fmt(m.paid)}</td><td className="r">{fmt(m.pending)}</td></tr>
              ))}
              <tr className="fin-total"><td>Total</td><td className="r">{fmt(co.salary)}</td><td className="r">{fmt(co.comm)}</td><td className="r">{fmt(co.exp)}</td><td className="r">{fmt(co.spend)}</td><td className="r">{fmt(co.total)}</td><td className="r">{fmt(co.paid)}</td><td className="r">{fmt(co.pending)}</td></tr>
            </tbody>
          </table></div>
        </div>
      )}
    </Shell>
  );
}
