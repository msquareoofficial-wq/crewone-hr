// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, NAV_KEYS } from "@/lib/db";

export async function PUT(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  for (const k of NAV_KEYS) {
    const v = String(b[k] ?? "").trim().slice(0, 40);
    if (v) await q("INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [`nav_${k}`, v]);
  }
  return NextResponse.json({ ok: true });
}
