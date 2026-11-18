// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { FIN_SECTIONS, FIN_COLS, okMonth, ensureMonth } from "@/lib/finance";

async function admin() {
  const me = await getSession();
  return me && me.role === "admin" ? me : null;
}

// Validates the editable fields. Returns null when a value is invalid.
function clean(b: any): Record<string, any> | null {
  const out: Record<string, any> = {};
  for (const k of ["name", "dept"]) if (b[k] !== undefined) out[k] = String(b[k]).trim().slice(0, 120);
  for (const k of ["amount", "get_amt", "commission"]) {
    if (b[k] === undefined) continue;
    const n = Number(b[k]);
    if (!Number.isFinite(n) || n < 0 || n > 1e10) return null;
    out[k] = Math.round(n * 100) / 100;
  }
  if (b.spent_on !== undefined) {
    const s = String(b.spent_on);
    if (s && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return null;
    out.spent_on = s || null;
  }
  if (b.paid !== undefined) out.paid = b.paid === true;
  if (b.paid_on !== undefined) {
    const s = String(b.paid_on || "");
    if (s && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return null;
    out.paid_on = s || null;
  }
  return out;
}

// POST { action:"add", month, section, ...fields } | { action:"import_staff", month }
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!okMonth(b.month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  await ensureMonth(b.month);
  if (b.action === "add") {
    if (!FIN_SECTIONS.includes(b.section)) return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    const f = clean(b);
    if (!f) return NextResponse.json({ error: "Invalid value" }, { status: 400 });
    const row = await q1<any>(
      `INSERT INTO finance_items (month, section, name, dept, amount, get_amt, commission, spent_on, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,(SELECT COALESCE(MAX(sort_order),0)+1 FROM finance_items WHERE month=$1 AND section=$2))
       RETURNING ${FIN_COLS}`,
      [b.month, b.section, f.name ?? "", f.dept ?? null, f.amount ?? 0, f.get_amt ?? 0, f.commission ?? 0, f.spent_on ?? null]
    );
    return NextResponse.json({ ok: true, row });
  }
  if (b.action === "import_staff") {
    const rows = await q<any>(
      `INSERT INTO finance_items (month, section, name, dept, amount, sort_order)
       SELECT $1, 'salary', u.name, u.department, COALESCE(u.monthly_salary,0),
         (SELECT COALESCE(MAX(sort_order),0) FROM finance_items WHERE month=$1 AND section='salary') + ROW_NUMBER() OVER (ORDER BY u.name)
       FROM users u
       WHERE u.role='user' AND u.active=TRUE
         AND NOT EXISTS (SELECT 1 FROM finance_items f WHERE f.month=$1 AND f.section='salary' AND LOWER(f.name)=LOWER(u.name))
       RETURNING ${FIN_COLS}`,
      [b.month]
    );
    return NextResponse.json({ ok: true, rows });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// PATCH { id, ...fields }
export async function PATCH(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  const id = Number(b.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const f = clean(b);
  if (!f || !Object.keys(f).length) return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  const cur = await q1<any>("SELECT section, amount::float AS amount, commission::float AS commission, get_amt::float AS get_amt, get_manual FROM finance_items WHERE id=$1", [id]);
  if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cur.section === "salary") {
    // Get follows Salary + Commission until it is edited by hand
    if (f.get_amt !== undefined) f.get_manual = true;
    else if ((f.commission !== undefined || f.amount !== undefined) && !cur.get_manual) {
      const a = f.amount !== undefined ? f.amount : cur.amount, c = f.commission !== undefined ? f.commission : cur.commission;
      if (c > 0 || cur.get_amt > 0) f.get_amt = Math.round((a + c) * 100) / 100;
    }
  }
  const keys = Object.keys(f);
  const row = await q1<any>(
    `UPDATE finance_items SET ${keys.map((k, i) => `${k}=$${i + 2}`).join(", ")} WHERE id=$1 RETURNING ${FIN_COLS}`,
    [id, ...keys.map((k) => f[k])]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}

// DELETE ?id=N
export async function DELETE(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await q("DELETE FROM finance_items WHERE id=$1", [id]);
  return NextResponse.json({ ok: true });
}
