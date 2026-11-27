// Powered By Vistech Force
"use client";
import { useState } from "react";
import { fmtMonth } from "@/lib/fmtdate";

type Row = { id: number; section: "salary" | "expense" | "spend" | "usd_spend"; name: string; dept: string | null; amount: number; get_amt: number; commission: number; spent_on: string | null; paid: boolean; paid_on: string | null };

const fmt = (n: number) => (n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const due = (r: Row) => (Number(r.amount) || 0) + (r.section === "salary" ? Number(r.commission) || 0 : 0);
const sum = (rs: Row[], k: "amount" | "get_amt" | "commission") => rs.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const SPEND_CATS = ["Spiff", "Subscription", "Equipment / PC", "Marketing", "Software", "Other"];
const USD_CATS = ["Software / SaaS", "API / Cloud", "Domain / Hosting", "Marketing", "Freelancer", "Other"];
const DEPTS = ["Sales", "Production", "Office Boy", "Designer", "Marketer"];

function shift(m: string, n: number) {
  return new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 1)).toISOString().slice(0, 7);
}

// Text cell: saves when you leave the box (or press Enter) and the text changed.
function Txt({ value, onSave, placeholder, list, autoFocus, type }: { value: string; onSave: (v: string) => void; placeholder?: string; list?: string; autoFocus?: boolean; type?: string }) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setV(value); }
  return (
    <input className="fin-in" type={type || "text"} value={v} placeholder={placeholder} list={list} autoFocus={autoFocus}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v.trim() !== value) onSave(v.trim()); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
  );
}

// Number cell: shows 12,500 when idle, raw digits while typing.
function Num({ value, onSave, dim }: { value: number; onSave: (n: number) => void; dim?: boolean }) {
  const [v, setV] = useState<string | null>(null);
  return (
    <input className={"fin-in fin-num" + (dim && !value ? " fin-dim" : "")} inputMode="decimal" value={v ?? fmt(value)}
      onFocus={(e) => { const t = e.target; setV(value ? String(value) : ""); setTimeout(() => t.select(), 0); }}
      onChange={(e) => setV(e.target.value.replace(/[^0-9.]/g, ""))}
      onBlur={() => { const n = Number(v ?? value); const edited = v !== null; setV(null); if (edited && Number.isFinite(n) && n !== value) onSave(n); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
  );
}

export default function FinanceClient({ month, cur, today, initial, usdC1 = "#1d4ed8", usdC2 = "#3b82f6" }: { month: string; cur: string; today: string; initial: Row[]; usdC1?: string; usdC2?: string }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [focus, setFocus] = useState<number | null>(null);
  const [ask, setAsk] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);

  const salary = rows.filter((r) => r.section === "salary");
  const expense = rows.filter((r) => r.section === "expense");
  const spend = rows.filter((r) => r.section === "spend");
  const usd = rows.filter((r) => r.section === "usd_spend");
  const tSalary = sum(salary, "amount"), tGet = sum(salary, "get_amt"), tComm = sum(salary, "commission");
  const tExp = sum(expense, "amount"), tSpend = sum(spend, "amount"), tUsd = sum(usd, "amount");
  const grand = tSalary + tComm + tExp + tSpend;
  const tPaid = rows.filter((r) => r.paid).reduce((a, r) => a + due(r), 0);
  const tPending = grand - tPaid;
  const paidPct = grand ? Math.round((tPaid / grand) * 100) : 0;
  const depts = Array.from(new Set([...DEPTS, ...salary.map((r) => r.dept || "").filter(Boolean)]));
  const cats = Array.from(new Set([...SPEND_CATS, ...spend.map((r) => r.dept || "").filter(Boolean)]));
  const usdCats = Array.from(new Set([...USD_CATS, ...usd.map((r) => r.dept || "").filter(Boolean)]));
  const byCat = new Map<string, number>();
  spend.forEach((r) => byCat.set(r.dept || "Other", (byCat.get(r.dept || "Other") || 0) + (Number(r.amount) || 0)));
  const usdByCat = new Map<string, number>();
  usd.forEach((r) => usdByCat.set(r.dept || "Other", (usdByCat.get(r.dept || "Other") || 0) + (Number(r.amount) || 0)));

  const fail = (j: any) => setMsg({ t: "err", m: j && j.error ? j.error : "Failed, please try again" });
  async function api(method: string, body?: any, qs = "") {
    try {
      const r = await fetch("/api/admin/finance" + qs, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      let j: any = {}; try { j = await r.json(); } catch {}
      return { ok: r.ok, j };
    } catch { return { ok: false, j: { error: "Network error, please try again" } }; }
  }
  async function add(section: Row["section"], init: any = {}) {
    setMsg(null);
    const x = await api("POST", { action: "add", month, section, ...init });
    if (!x.ok) return fail(x.j);
    setRows((rs) => [...rs, x.j.row]);
    setFocus(x.j.row.id);
  }
  async function patch(id: number, p: Partial<Row>) {
    setMsg(null);
    const old = rows.find((r) => r.id === id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
    const x = await api("PATCH", { id, ...p });
    if (!x.ok) { setRows((rs) => rs.map((r) => (r.id === id && old ? old : r))); fail(x.j); }
    else if (x.j.row) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...x.j.row } : r)));
  }
  async function del(id: number) {
    const x = await api("DELETE", undefined, "?id=" + id);
    if (x.ok) setRows((rs) => rs.filter((r) => r.id !== id)); else fail(x.j);
    setAsk(null);
  }
  async function importStaff() {
    setMsg(null);
    const x = await api("POST", { action: "import_staff", month });
    if (!x.ok) return fail(x.j);
    const added: Row[] = x.j.rows || [];
    setRows((rs) => [...rs, ...added]);
    setMsg({ t: "okmsg", m: added.length ? `Added ${added.length} staff from the HR users list` : "All HR staff are already in the list" });
  }
  function csv() {
    const NL = String.fromCharCode(10);
    const c = (v: any) => '"' + String(v ?? "").split('"').join('""') + '"';
    const L: string[] = [];
    L.push(["Salary sheet " + month].map(c).join(","));
    L.push(["S.No", "Name", "Salary PKR", "Get", "Commission", "Total pay", "Department", "Status"].map(c).join(","));
    salary.forEach((r, i) => L.push([i + 1, r.name, r.amount, r.get_amt, r.commission, r.amount + r.commission, r.dept, r.paid ? "Paid" : "Pending"].map(c).join(",")));
    L.push(["Total", "", tSalary, tGet, tComm, tSalary + tComm, "", ""].map(c).join(","));
    L.push("");
    L.push(["Office expense"].map(c).join(","));
    expense.forEach((r) => L.push([r.name, r.amount, r.paid ? "Paid" : "Pending"].map(c).join(",")));
    L.push(["Total", tExp].map(c).join(","));
    L.push("");
    L.push(["Monthly spending"].map(c).join(","));
    L.push(["Date", "Title", "Category", "Amount PKR", "Status"].map(c).join(","));
    spend.forEach((r) => L.push([r.spent_on, r.name, r.dept, r.amount, r.paid ? "Paid" : "Pending"].map(c).join(",")));
    L.push(["Total", "", "", tSpend, ""].map(c).join(","));
    L.push("");
    L.push(["Dollar Expenses (USD)"].map(c).join(","));
    L.push(["Date", "Title", "Category", "Amount USD", "Status"].map(c).join(","));
    usd.forEach((r) => L.push([r.spent_on, r.name, r.dept, r.amount, r.paid ? "Paid" : "Pending"].map(c).join(",")));
    L.push(["Total USD", "", "", tUsd, ""].map(c).join(","));
    L.push("");
    L.push(["Grand total PKR (salary + commission + office expense + spending)", grand].map(c).join(","));
    L.push(["Paid", tPaid].map(c).join(","));
    L.push(["Pending", tPending].map(c).join(","));
    L.push(["Total dollar expenses USD", tUsd].map(c).join(","));
    const blob = new Blob([L.join(NL)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `finance-${month}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const Pay = ({ r }: { r: Row }) => (
    <button type="button" className={"fin-pay" + (r.paid ? " on" : "")} title={r.paid && r.paid_on ? "Paid on " + r.paid_on + ". Click to mark pending" : "Click to mark as paid"}
      onClick={() => patch(r.id, { paid: !r.paid, paid_on: r.paid ? null : today })}>{r.paid ? "Paid" : "Pending"}</button>
  );

  const Del = ({ id }: { id: number }) =>
    ask === id ? (
      <span className="fin-ask"><button className="btn sm bad" onClick={() => del(id)}>Delete</button><button className="btn sec sm" onClick={() => setAsk(null)}>No</button></span>
    ) : (
      <button className="fin-x" title="Delete this row" aria-label="Delete this row" onClick={() => setAsk(id)}>&times;</button>
    );

  return (
    <>
      <datalist id="fin-dept">{depts.map((d) => <option key={d} value={d} />)}</datalist>
      <datalist id="fin-cat">{cats.map((d) => <option key={d} value={d} />)}</datalist>
      <datalist id="fin-usd-cat">{usdCats.map((d) => <option key={d} value={d} />)}</datalist>

      <div className="card fin-bar">
        <div className="fin-nav">
          <a className="btn sec sm" href={`?month=${shift(month, -1)}`} aria-label="Previous month">&lsaquo;</a>
          <b className="fin-month">{fmtMonth(month)}</b>
          {month < cur ? <a className="btn sec sm" href={`?month=${shift(month, 1)}`} aria-label="Next month">&rsaquo;</a> : <span className="btn sec sm fin-off" aria-hidden="true">&rsaquo;</span>}
          <form method="get" className="row" style={{ marginLeft: 8 }}><input type="month" name="month" max={cur} defaultValue={month} style={{ width: 160 }} /><button className="btn sec sm">Go</button></form>
        </div>
        <div className="spacer" />
        <a className="btn sec" href={`/admin/finance/ledger?to=${month}`}>Ledger</a>
        <button className="btn sec" onClick={csv}>Download CSV</button>
      </div>
      {msg && <div className={msg.t} style={{ marginBottom: 14 }}>{msg.m}</div>}

      <div className="fin-tiles">
        <div className="stat"><div className="n">{fmt(tSalary)}</div><div className="l">Salaries</div></div>
        <div className="stat"><div className="n">{fmt(tComm)}</div><div className="l">Commission</div></div>
        <div className="stat"><div className="n">{fmt(tExp)}</div><div className="l">Office expense</div></div>
        <div className="stat"><div className="n">{fmt(tSpend)}</div><div className="l">Monthly spending</div></div>
        <div className="stat fin-grand"><div className="n">{fmt(grand)}</div><div className="l">Grand total (PKR)</div></div>
        <div className="stat fin-usd" style={{ background: `linear-gradient(135deg,${usdC1},${usdC2})` }}><div className="n">{"$" + fmt(tUsd)}</div><div className="l">Dollar Expenses</div></div>
      </div>

      <div className="card fin-paidbar">
        <div className="fin-pb-row"><span><b>Paid</b> {fmt(tPaid)}</span><span><b>Pending</b> {fmt(tPending)}</span><span className="mute">{paidPct}% paid</span></div>
        <div className="fin-pb"><i style={{ width: paidPct + "%" }} /></div>
      </div>

      <div className="card">
        <div className="row"><h2 style={{ margin: 0 }}>Salary sheet</h2><div className="spacer" />
          <button className="btn sec sm" onClick={importStaff}>Import staff from HR</button>
          <button className="btn sm" onClick={() => add("salary")}>+ Add person</button>
        </div>
        <div className="scroll">
          <table className="fin-t fin-w1">
            <thead><tr><th style={{ width: 44 }}>#</th><th>Name</th><th className="r">Salary PKR</th><th className="r">Get</th><th className="r">Commission</th><th className="r">Total pay</th><th>Department</th><th style={{ width: 92 }}>Status</th><th style={{ width: 90 }}></th></tr></thead>
            <tbody>
              {salary.map((r, i) => (
                <tr key={r.id}>
                  <td className="mute">{i + 1}</td>
                  <td><Txt value={r.name} placeholder="Name" autoFocus={focus === r.id} onSave={(v) => patch(r.id, { name: v })} /></td>
                  <td><Num value={r.amount} onSave={(n) => patch(r.id, { amount: n })} /></td>
                  <td><Num dim value={r.get_amt} onSave={(n) => patch(r.id, { get_amt: n })} /></td>
                  <td><Num dim value={r.commission} onSave={(n) => patch(r.id, { commission: n })} /></td>
                  <td className="r fin-calc">{fmt(r.amount + r.commission)}</td>
                  <td><Txt value={r.dept || ""} list="fin-dept" placeholder="Department" onSave={(v) => patch(r.id, { dept: v })} /></td>
                  <td><Pay r={r} /></td>
                  <td className="r"><Del id={r.id} /></td>
                </tr>
              ))}
              {!salary.length && <tr><td colSpan={9} className="mute">No one added yet. Click &quot;+ Add person&quot; or &quot;Import staff from HR&quot;.</td></tr>}
              <tr className="fin-total"><td></td><td>Total</td><td className="r">{fmt(tSalary)}</td><td className="r">{fmt(tGet)}</td><td className="r">{fmt(tComm)}</td><td className="r fin-calc">{fmt(tSalary + tComm)}</td><td colSpan={3}></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="fin-two">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="row"><h2 style={{ margin: 0 }}>Office expense</h2><div className="spacer" /><button className="btn sm" onClick={() => add("expense")}>+ Add expense</button></div>
          <p className="mute" style={{ margin: "4px 0 8px" }}>Copied from last month. Change an amount when the bill changes.</p>
          <div className="scroll">
            <table className="fin-t fin-w3">
              <thead><tr><th>Item</th><th className="r" style={{ width: 110 }}>Amount PKR</th><th style={{ width: 84 }}>Status</th><th style={{ width: 40 }}></th></tr></thead>
              <tbody>
                {expense.map((r) => (
                  <tr key={r.id}>
                    <td><Txt value={r.name} placeholder="Expense name" autoFocus={focus === r.id} onSave={(v) => patch(r.id, { name: v })} /></td>
                    <td><Num dim value={r.amount} onSave={(n) => patch(r.id, { amount: n })} /></td>
                    <td><Pay r={r} /></td>
                    <td className="r"><Del id={r.id} /></td>
                  </tr>
                ))}
                {!expense.length && <tr><td colSpan={4} className="mute">No expenses yet. Click &quot;+ Add expense&quot;.</td></tr>}
                <tr className="fin-total"><td>Total</td><td className="r">{fmt(tExp)}</td><td></td><td></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="row"><h2 style={{ margin: 0 }}>Monthly spending</h2><div className="spacer" /><button className="btn sm" onClick={() => add("spend", { spent_on: today, dept: "Other" })}>+ Add spending</button></div>
          <p className="mute" style={{ margin: "4px 0 8px" }}>Day to day spending this month: spiff, subscriptions, PC and so on. Starts empty every month.</p>
          <div className="scroll">
            <table className="fin-t fin-w2">
              <thead><tr><th style={{ width: 128 }}>Date</th><th>Title</th><th style={{ width: 140 }}>Category</th><th className="r" style={{ width: 110 }}>Amount PKR</th><th style={{ width: 84 }}>Status</th><th style={{ width: 40 }}></th></tr></thead>
              <tbody>
                {spend.map((r) => (
                  <tr key={r.id} className={!r.amount ? "fin-zero" : ""}>
                    <td><Txt type="date" value={r.spent_on || ""} onSave={(v) => patch(r.id, { spent_on: v })} /></td>
                    <td><Txt value={r.name} placeholder="What was it?" autoFocus={focus === r.id} onSave={(v) => patch(r.id, { name: v })} /></td>
                    <td><Txt value={r.dept || ""} list="fin-cat" placeholder="Category" onSave={(v) => patch(r.id, { dept: v })} /></td>
                    <td><Num value={r.amount} onSave={(n) => patch(r.id, { amount: n })} /></td>
                    <td><Pay r={r} /></td>
                    <td className="r"><Del id={r.id} /></td>
                  </tr>
                ))}
                {!spend.length && <tr><td colSpan={6} className="mute">Nothing added this month yet.</td></tr>}
                <tr className="fin-total"><td></td><td>Total</td><td></td><td className="r">{fmt(tSpend)}</td><td></td><td></td></tr>
              </tbody>
            </table>
          </div>
          {byCat.size > 0 && <div className="fin-chips">{Array.from(byCat.entries()).map(([k, v]) => <span key={k} className="badge b-info">{k}: {fmt(v)}</span>)}</div>}
        </div>
      </div>

      <div className="card">
        <div className="row"><h2 style={{ margin: 0 }}>Dollar Expenses ($)</h2><div className="spacer" /><button className="btn sm" onClick={() => add("usd_spend", { spent_on: today, dept: "Other" })}>+ Add dollar expense</button></div>
        <p className="mute" style={{ margin: "4px 0 8px" }}>Payments made in US dollars — software, APIs, domains, freelancers, etc. Starts empty every month.</p>
        <div className="scroll">
          <table className="fin-t fin-w2">
            <thead><tr><th style={{ width: 128 }}>Date</th><th>Title</th><th style={{ width: 140 }}>Category</th><th className="r" style={{ width: 110 }}>Amount $</th><th style={{ width: 84 }}>Status</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {usd.map((r) => (
                <tr key={r.id} className={!r.amount ? "fin-zero" : ""}>
                  <td><Txt type="date" value={r.spent_on || ""} onSave={(v) => patch(r.id, { spent_on: v })} /></td>
                  <td><Txt value={r.name} placeholder="What was it?" autoFocus={focus === r.id} onSave={(v) => patch(r.id, { name: v })} /></td>
                  <td><Txt value={r.dept || ""} list="fin-usd-cat" placeholder="Category" onSave={(v) => patch(r.id, { dept: v })} /></td>
                  <td><Num value={r.amount} onSave={(n) => patch(r.id, { amount: n })} /></td>
                  <td><Pay r={r} /></td>
                  <td className="r"><Del id={r.id} /></td>
                </tr>
              ))}
              {!usd.length && <tr><td colSpan={6} className="mute">No dollar expenses this month. Click &quot;+ Add dollar expense&quot;.</td></tr>}
              <tr className="fin-total"><td></td><td>Total</td><td></td><td className="r">{"$" + fmt(tUsd)}</td><td></td><td></td></tr>
            </tbody>
          </table>
        </div>
        {usdByCat.size > 0 && <div className="fin-chips">{Array.from(usdByCat.entries()).map(([k, v]) => <span key={k} className="badge b-warn">{k}: ${fmt(v)}</span>)}</div>}
      </div>

      <p className="mute" style={{ marginTop: 14 }}>Grand total (PKR) = salaries + commission + office expense + monthly spending. Dollar expenses are tracked separately in USD. Get = Salary + Commission, filled when you add commission and automatically from the 4th for the closed month. Changes save automatically when you leave a box.</p>
    </>
  );
}
