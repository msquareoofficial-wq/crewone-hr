// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";

// Admin only. { light?: dataUrl | null, dark?: dataUrl | null }. null resets to the default logo.
export async function PUT(req: Request) {
  const me = await getSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  let changed = false;
  for (const k of ["light", "dark"] as const) {
    if (!(k in b)) continue;
    const v = b[k];
    if (v === null) {
      await q("DELETE FROM settings WHERE key=$1", ["logo_" + k]);
    } else {
      if (typeof v !== "string" || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v)) return NextResponse.json({ error: "Logo must be a PNG image" }, { status: 400 });
      if (v.length > 700_000) return NextResponse.json({ error: "Logo is too large" }, { status: 400 });
      await q("INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ["logo_" + k, v]);
    }
    changed = true;
  }
  if (changed) await q("INSERT INTO settings (key,value) VALUES ('logo_version',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [String(Date.now())]);
  return NextResponse.json({ ok: true });
}
