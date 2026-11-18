// Powered By Vistech Force
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";

// Logging out only ends the browser session. OUT is marked only by the OUT button.
export async function POST() {
  const me = await getSession();
  if (me) await logActivity(me.id, "auth", "Logged out");
  await clearSession();
  return NextResponse.json({ ok: true });
}
