// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { expandDates } from "@/lib/hr";
import { pushAudience } from "@/lib/push";

export async function POST(req: Request) {
  const me = await getSession();
  if (!me || !can(me, "notifications")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  const title = String(b.title || "").trim(), body = String(b.body || "").trim();
  const audience = b.audience || "all";
  if (!title || !body) return NextResponse.json({ error: "Title and message are both required" }, { status: 400 });
  if (!["all", "Sales", "Production"].includes(audience)) return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  let dates: string[] = [];
  const isHoliday = !!b.holiday;
  if (isHoliday) {
    const d = expandDates(b.holiday.start, b.holiday.end || b.holiday.start);
    if (!d) return NextResponse.json({ error: "Invalid holiday dates (max 60 days)" }, { status: 400 });
    dates = d;
  }
  const n = await q1<{ id: number }>(
    "INSERT INTO notifications (author_id, title, body, audience, kind) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [me.id, title.slice(0, 200), body.slice(0, 5000), audience, isHoliday ? "holiday" : "update"]
  );
  for (const d of dates)
    await q("INSERT INTO holidays (holiday_date, title, notification_id) VALUES ($1,$2,$3) ON CONFLICT (holiday_date) DO UPDATE SET title=EXCLUDED.title, notification_id=EXCLUDED.notification_id", [d, title.slice(0, 200), n!.id]);
  await pushAudience(audience, me.id, isHoliday ? "Holiday: " + title : title, body, "/dashboard");
  return NextResponse.json({ id: n!.id });
}
