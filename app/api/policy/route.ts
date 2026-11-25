// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { pushAudience } from "@/lib/push";

async function ensureTable() {
  await q(`
    CREATE TABLE IF NOT EXISTS policy_points (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function markPolicyUpdated() {
  await q(
    "INSERT INTO settings (key, value) VALUES ('policy_last_updated', $1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
    [new Date().toISOString()]
  );
}

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const rows = await q("SELECT id, title, body, sort_order FROM policy_points ORDER BY sort_order ASC, id ASC");
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const { title, body } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const maxRow = await q<{ max: number }>("SELECT COALESCE(MAX(sort_order),0) AS max FROM policy_points");
  const nextOrder = (maxRow[0]?.max ?? 0) + 1;
  const rows = await q<{ id: number }>(
    "INSERT INTO policy_points (title, body, sort_order) VALUES ($1, $2, $3) RETURNING id",
    [title.trim(), (body ?? "").trim(), nextOrder]
  );
  await markPolicyUpdated();
  // insert notification for all users
  try {
    await q(
      "INSERT INTO notifications (author_id, title, body, audience, kind) VALUES ($1,$2,$3,'all','update')",
      [me.id, "New Company Policy", title.trim().slice(0, 200)]
    );
    await pushAudience("all", me.id, "New Company Policy", title.trim(), "/policy");
  } catch {}
  return NextResponse.json({ id: rows[0].id });
}
