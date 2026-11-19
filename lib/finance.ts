// Powered By Vistech Force
import { q, q1 } from "./db";

export const FIN_SECTIONS = ["salary", "expense", "spend", "usd_spend"] as const;
export type FinSection = (typeof FIN_SECTIONS)[number];

export const okMonth = (m: any): m is string => typeof m === "string" && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(m);

export function shiftMonth(m: string, n: number) {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export const FIN_COLS = "id, section, name, dept, amount::float AS amount, get_amt::float AS get_amt, commission::float AS commission, spent_on, paid, paid_on, sort_order";

// The first time a month is opened, the salary and office expense lines of the latest earlier month are copied
// (Get and Commission start at 0). The "spend" section always starts empty.
export async function ensureMonth(month: string) {
  const first = await q1("INSERT INTO finance_months (month) VALUES ($1) ON CONFLICT DO NOTHING RETURNING month", [month]);
  if (!first) return;
  try {
    const prev = await q1<{ m: string | null }>("SELECT MAX(month) AS m FROM finance_items WHERE month < $1 AND section IN ('salary','expense')", [month]);
    if (!prev || !prev.m) return;
    await q(
      "INSERT INTO finance_items (month, section, name, dept, amount, sort_order) SELECT $1, section, name, dept, amount, sort_order FROM finance_items WHERE month=$2 AND section IN ('salary','expense') ORDER BY sort_order, id",
      [month, prev.m]
    );
  } catch (e) {
    await q("DELETE FROM finance_months WHERE month=$1", [month]);
    throw e;
  }
}

// Get = Salary + Commission. A month is "closed" on the 3rd of the next month, so from the 4th
// every earlier month gets its Get filled for lines that are still 0 and were never edited by hand.
export async function autoFillGet(cur: string, day: number) {
  const cutoff = day >= 4 ? cur : shiftMonth(cur, -1);
  await q("UPDATE finance_items SET get_amt = amount + commission WHERE section='salary' AND month < $1 AND get_amt = 0 AND get_manual = FALSE AND (amount + commission) > 0", [cutoff]);
}

export async function listItems(month: string) {
  return q<any>(`SELECT ${FIN_COLS} FROM finance_items WHERE month=$1 ORDER BY sort_order, id`, [month]);
}

// Amount that is owed for one line: salary lines = salary + commission, other lines = amount.
export const lineDue = (r: { section: string; amount: number; commission: number }) =>
  (Number(r.amount) || 0) + (r.section === "salary" ? Number(r.commission) || 0 : 0);

export type LedgerRow = { id: number; month: string; section: string; name: string; dept: string | null; amount: number; commission: number; spent_on: string | null; paid: boolean; paid_on: string | null };

// Clamps a month range: both inside [2000-01, cur], from <= to, at most 36 months.
export function clampRange(from: any, to: any, cur: string) {
  let t = okMonth(to) ? to : cur;
  if (t > cur) t = cur;
  let f = okMonth(from) ? from : shiftMonth(t, -2);
  if (f > t) f = t;
  if (shiftMonth(f, 35) < t) f = shiftMonth(t, -35);
  return { from: f, to: t };
}

export function monthsBetween(from: string, to: string) {
  const out: string[] = [];
  for (let m = from; m <= to; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

// All finance lines in the range, plus per person and per month totals.
export async function buildLedger(from: string, to: string, emp: string, status: string) {
  const all = await q<LedgerRow>(
    "SELECT id, month, section, name, dept, amount::float AS amount, commission::float AS commission, spent_on, paid, COALESCE(paid_on, '') AS paid_on FROM finance_items WHERE month >= $1 AND month <= $2 ORDER BY month, section, sort_order, id",
    [from, to]
  );
  const key = (n: string) => n.trim().toLowerCase();
  const names = new Map<string, string>();
  all.filter((r) => r.section === "salary" && r.name.trim()).forEach((r) => { if (!names.has(key(r.name))) names.set(key(r.name), r.name.trim()); });
  const okStatus = (r: LedgerRow) => status === "paid" ? r.paid : status === "pending" ? !r.paid : true;
  const staff = all.filter((r) => r.section === "salary" && r.name.trim() !== "" && (!emp || key(r.name) === emp) && okStatus(r));
  const people = new Map<string, { name: string; dept: string; months: number; due: number; paid: number }>();
  staff.forEach((r) => {
    const k = key(r.name);
    const p = people.get(k) || { name: r.name.trim(), dept: r.dept || "", months: 0, due: 0, paid: 0 };
    p.months += 1; p.due += lineDue(r); if (r.paid) p.paid += lineDue(r); if (r.dept) p.dept = r.dept;
    people.set(k, p);
  });
  const monthly = monthsBetween(from, to).map((m) => {
    const rs = all.filter((r) => r.month === m && okStatus(r));
    const sum = (sec: string, f: (r: LedgerRow) => number) => rs.filter((r) => r.section === sec).reduce((a, r) => a + f(r), 0);
    const salary = sum("salary", (r) => r.amount), comm = sum("salary", (r) => r.commission);
    const exp = sum("expense", (r) => r.amount), spend = sum("spend", (r) => r.amount);
    const usd = sum("usd_spend", (r) => r.amount);
    const paid = rs.filter((r) => r.paid).reduce((a, r) => a + lineDue(r), 0);
    const total = salary + comm + exp + spend;
    return { month: m, rows: rs.length, salary, comm, exp, spend, usd, total, paid, pending: total - paid };
  });
  return { all, names: Array.from(names.entries()).sort((a, b) => a[1].localeCompare(b[1])), staff, people: Array.from(people.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => a.name.localeCompare(b.name)), monthly };
}
