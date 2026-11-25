// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";

async function ensureAckTable() {
  await q(`
    CREATE TABLE IF NOT EXISTS policy_acks (
      user_id INT PRIMARY KEY,
      acked_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function POST() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureAckTable();
  await q(
    "INSERT INTO policy_acks (user_id, acked_at) VALUES ($1, now()) ON CONFLICT (user_id) DO UPDATE SET acked_at=now()",
    [me.id]
  );
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureAckTable();
  const [ack, lastUpdated] = await Promise.all([
    q<{ acked_at: string }>("SELECT acked_at FROM policy_acks WHERE user_id=$1", [me.id]),
    q<{ value: string }>("SELECT value FROM settings WHERE key='policy_last_updated'"),
  ]);
  const ackedAt = ack[0]?.acked_at ? new Date(ack[0].acked_at) : null;
  const lu = lastUpdated[0]?.value ? new Date(lastUpdated[0].value) : null;
  const acknowledged = !!ackedAt && (!lu || ackedAt >= lu);
  return NextResponse.json({ acknowledged, acked_at: ackedAt?.toISOString() ?? null });
}
