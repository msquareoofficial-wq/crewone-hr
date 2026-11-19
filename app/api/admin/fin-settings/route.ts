// Powered By Vistech Force
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  await requireAdmin(req);
  const { c1, c2 } = await req.json();
  const save = async (key: string, val: string) =>
    q("INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2", [key, val]);
  if (c1 && /^#[0-9a-fA-F]{6}$/.test(c1)) await save("fin_usd_color1", c1);
  if (c2 && /^#[0-9a-fA-F]{6}$/.test(c2)) await save("fin_usd_color2", c2);
  return NextResponse.json({ ok: true });
}
