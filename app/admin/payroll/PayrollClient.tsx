// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate, fmtMonth } from "@/lib/fmtdate";

type Row = any;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NUMF = ["base_salary", "present_days", "leave_days", "absent_days", "late_count", "absent_deduction", "late_deduction", "bonus", "other_deduction"] as const;
const fmt = (n: number) => (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const net = (r: Row) => Math.max(0, Math.round((r.base_salary - r.absent_deduction - r.late_deduction + r.bonus - r.other_deduction) * 100) / 100);

async function call(method: string, body: any) {
  const r = await fetch("/api/payroll", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let j: any = {}; try { j = await r.json(); } catch {}
  return { ok: r.ok, j };
}

export default function PayrollClient({ month, rows, weeklyOff, leavesPaid }: { month: string; rows: Row[]; weeklyOff: number; leavesPaid: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);
  const [off, setOff] = useState(weeklyOff);
  const [paid, setPaid] = useState(leavesPaid);
  const [edit, setEdit] = useState<Record<number, Row>>({});
  const [sal, setSal] = useState<Record<number, string>>({});
  const done = (m: string) => { setMsg({ t: "okmsg", m }); router.refresh(); };
  const fail = (j: any) => setMsg({ t: "err", m: j.error || "Failed" });

  const total = rows.reduce((a, r) => a + (r.id ? Number(r.net_salary) : 0), 0);

  return (
    <>
      <div className="card">
        <div className="row">
          <form method="get" className="row"><label style={{ margin: 0 }}>Month</label><input type="month" name="month" defaultValue={month} style={{ width: 170 }} /><button className="btn sec sm">Go</button></form>
          <div className="spacer" />
          <button className="btn" onClick={async () => { const x = await call("POST", { action: "generate", month }); x.ok ? done(`Auto calculated ${x.j.count} users (manual and paid rows were kept)`) : fail(x.j); }}>Calculate automatically</button>
          <a className="btn sec" href={`/api/payroll?month=${month}`}>Download CSV</a>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div><label>Weekly off day</label><select value={off} onChange={(e) => setOff(Number(e.target.value))} style={{ width: 150 }}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}<option value={7}>None</option></select></div>
          <label className="row" style={{ color: "var(--ink)", fontWeight: 400, margin: "18px 0 0" }}><input type="checkbox" style={{ width: "auto" }} checked={paid} onChange={(e) => setPaid(e.target.checked)} />Approved leaves are paid</label>
          <button className="btn sec sm" style={{ marginTop: 18 }} onClick={async () => { const x = await call("PUT", { weekly_off: off, leaves_paid: paid }); x.ok ? done("Rules saved. Click Calculate automatically to apply.") : fail(x.j); }}>Save rules</button>
        </div>
        <p className="mute" style={{ marginBottom: 0 }}>Auto formula: per day = salary / working days (weekly offs and holidays excluded). Deductions = absent days x per day, plus (lates / lates-per-off) x per day. Net = salary - deductions + bonus - other deduction. You can edit any row manually.</p>
        {msg && <div className={msg.t}>{msg.m}</div>}
      </div>

      <div className="card">
        <div className="row"><h2 style={{ margin: 0 }}>Payroll for {fmtMonth(month)}</h2><div className="spacer" /><b>Total net: {fmt(total)}</b></div>
        <div className="scroll">
          <table>
            <thead><tr><th>Employee</th><th>Monthly salary</th><th>Work days</th><th>Present</th><th>Leave</th><th>Absent</th><th>Lates</th><th>Absent ded.</th><th>Late ded.</th><th>Bonus</th><th>Other ded.</th><th>Net</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const e = edit[r.user_id];
                const v = e ?? r;
                const num = (k: (typeof NUMF)[number]) => e
                  ? <input type="number" min={0} step="0.01" style={{ width: 90 }} value={e[k]} onChange={(x) => { const n = { ...e, [k]: Number(x.target.value) }; n.net_salary = net(n); setEdit({ ...edit, [r.user_id]: n }); }} />
                  : fmt(r[k]);
                return (
                  <tr key={r.user_id}>
                    <td>{r.name}<div className="mute">{r.emp_id}</div></td>
                    <td><div className="row" style={{ flexWrap: "nowrap" }}>
                      <input type="number" min={0} style={{ width: 100 }} value={sal[r.user_id] ?? String(r.monthly_salary)} onChange={(x) => setSal({ ...sal, [r.user_id]: x.target.value })} />
                      {sal[r.user_id] !== undefined && sal[r.user_id] !== String(r.monthly_salary) && <button className="btn sm" onClick={async () => { const x = await call("PUT", { userId: r.user_id, monthly_salary: Number(sal[r.user_id]) }); x.ok ? done("Salary saved. Recalculate to apply.") : fail(x.j); }}>Save</button>}
                    </div></td>
                    {r.id ? (
                      <>
                        <td>{r.working_days}</td><td>{num("present_days")}</td><td>{num("leave_days")}</td><td>{num("absent_days")}</td><td>{num("late_count")}</td>
                        <td>{num("absent_deduction")}</td><td>{num("late_deduction")}</td><td>{num("bonus")}</td><td>{num("other_deduction")}</td>
                        <td><b>{e ? <input type="number" min={0} step="0.01" style={{ width: 100 }} value={v.net_salary} onChange={(x) => setEdit({ ...edit, [r.user_id]: { ...e, net_salary: Number(x.target.value) } })} /> : fmt(r.net_salary)}</b></td>
                        <td><span className={`badge ${r.status === "paid" ? "b-ok" : "b-warn"}`}>{r.status === "paid" ? "Paid" : "Draft"}</span> {r.manual && <span className="badge b-info">Manual</span>}</td>
                        <td><div className="row" style={{ flexWrap: "nowrap" }}>
                          {e ? (
                            <>
                              <input placeholder="Note" style={{ width: 120 }} value={e.note ?? ""} onChange={(x) => setEdit({ ...edit, [r.user_id]: { ...e, note: x.target.value } })} />
                              <button className="btn sm" onClick={async () => { const x = await call("PUT", { id: r.id, ...e }); if (x.ok) { const c = { ...edit }; delete c[r.user_id]; setEdit(c); done("Saved manually"); } else fail(x.j); }}>Save</button>
                              <button className="btn sec sm" onClick={() => { const c = { ...edit }; delete c[r.user_id]; setEdit(c); }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn sec sm" disabled={r.status === "paid"} onClick={() => setEdit({ ...edit, [r.user_id]: { ...r } })}>Edit</button>
                              <button className="btn sec sm" disabled={r.status === "paid"} title="Back to automatic values" onClick={async () => { const x = await call("POST", { action: "recalc", id: r.id }); x.ok ? done("Recalculated") : fail(x.j); }}>Recalc</button>
                              <button className={`btn sm ${r.status === "paid" ? "sec" : "ok"}`} onClick={async () => { const x = await call("PUT", { id: r.id, status: r.status === "paid" ? "draft" : "paid" }); x.ok ? done(r.status === "paid" ? "Marked unpaid" : "Marked paid") : fail(x.j); }}>{r.status === "paid" ? "Undo paid" : "Mark paid"}</button>
                            </>
                          )}
                        </div></td>
                      </>
                    ) : <td colSpan={12} className="mute">Not calculated yet. Click "Calculate automatically".</td>}
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={14} className="mute">No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
