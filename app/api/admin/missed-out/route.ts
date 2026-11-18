// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1, getSettings } from "@/lib/db";
import { autoCloseStale } from "@/lib/missedout";
import { logActivity } from "@/lib/activity";

const T = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

// Admin: set the real OUT time for a day the user forgot, or accept the automatic OUT (end of shift).
export async function PUT(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  const id = Number(b.id), time = b.time ? String(b.time) : null;
  const row = await q1<any>("SELECT a.id, a.user_id, a.work_date, u.name FROM attendance a JOIN users u ON u.id=a.user_id WHERE a.id=$1", [id]);
  if (!row) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  if (time) {
    if (!T.test(time)) return NextResponse.json({ error: "Invalid time" }, { status: 400 });
    const s = await getSettings();
    // the OUT time is on the work date, or on the next day when it is earlier than the IN time (night shift)
    await q(
      `UPDATE attendance SET auto_out=FALSE, out_confirmed=TRUE,
         sign_out = CASE WHEN (($2::text || ' ' || $3::text)::timestamp AT TIME ZONE $4::text) > sign_in
                         THEN (($2::text || ' ' || $3::text)::timestamp AT TIME ZONE $4::text)
                         ELSE (($2::text || ' ' || $3::text)::timestamp + interval '1 day') AT TIME ZONE $4::text END
       WHERE id=$1`, [id, row.work_date, time, s.timezone]);
  } else {
    await autoCloseStale(row.user_id, true);
    await q("UPDATE attendance SET auto_out=FALSE, out_confirmed=TRUE WHERE id=$1", [id]);
  }
  await autoCloseStale(row.user_id, true);
  await logActivity(me.id, "attendance", "Fixed missed OUT", `${row.name}, ${row.work_date}${time ? " OUT " + time : " (kept shift end)"}`);
  return NextResponse.json({ ok: true });
}
