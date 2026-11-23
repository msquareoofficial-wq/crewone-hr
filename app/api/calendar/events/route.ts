// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";

export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end required" }, { status: 400 });
  const rows = await q<any>(
    `SELECT id, created_by, title, description, start_dt, end_dt, color, all_day, visibility
     FROM calendar_events
     WHERE (created_by = $1 OR visibility = 'team')
       AND start_dt < $3::date + interval '1 day'
       AND end_dt   >= $2::date
     ORDER BY start_dt`,
    [me.id, start, end]
  );
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!b.start_dt || !b.end_dt) return NextResponse.json({ error: "start_dt and end_dt required" }, { status: 400 });
  const row = await q1<{ id: number }>(
    `INSERT INTO calendar_events (created_by, title, description, start_dt, end_dt, color, all_day, visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      me.id,
      b.title.trim(),
      b.description || null,
      b.start_dt,
      b.end_dt,
      b.color || "#4f46e5",
      b.all_day ?? false,
      b.visibility === "team" ? "team" : "personal"
    ]
  );
  return NextResponse.json(row, { status: 201 });
}
