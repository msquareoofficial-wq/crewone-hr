import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";
import { BRAND } from "@/lib/brand";

export async function GET(_: Request, ctx: { params: Promise<{ variant: string }> }) {
  const { variant } = await ctx.params;
  if (variant !== "light" && variant !== "dark") return new NextResponse("Not found", { status: 404 });
  const row = await q1<{ value: string }>("SELECT value FROM settings WHERE key=$1", ["logo_" + variant]);
  const m = row?.value.match(/^data:(image\/png);base64,(.+)$/);
  if (!m) return NextResponse.redirect(variant === "light" ? BRAND.logoLight : BRAND.logoDark, 302);
  return new NextResponse(new Uint8Array(Buffer.from(m[2], "base64")), {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
