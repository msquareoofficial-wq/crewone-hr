// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q } from "@/lib/db";

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY || null });
}

export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  const e = String(b.endpoint || ""), p = String(b.keys?.p256dh || ""), a = String(b.keys?.auth || "");
  if (!e.startsWith("https://") || !p || !a) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  await q("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1,$2,$3,$4) ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth", [me.id, e, p, a]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  await q("DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2", [me.id, String(b.endpoint || "")]);
  return NextResponse.json({ ok: true });
}
