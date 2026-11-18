// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";

export async function PUT(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  const grace = Number(b.grace_minutes), per = Number(b.lates_per_off), tz = String(b.timezone || ""), quota = Number(b.leave_quota ?? 12);
  if (!(grace >= 0 && grace <= 600) || !(per >= 1 && per <= 31) || !(quota >= 0 && quota <= 366)) return NextResponse.json({ error: "Invalid values" }, { status: 400 });
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); } catch { return NextResponse.json({ error: "Invalid timezone" }, { status: 400 }); }
  for (const [k, v] of [["grace_minutes", grace], ["lates_per_off", per], ["timezone", tz], ["leave_quota", quota]] as const)
    await q("INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [k, String(v)]);
  return NextResponse.json({ ok: true });
}
