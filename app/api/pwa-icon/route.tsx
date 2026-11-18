// Powered By Vistech Force
import { ImageResponse } from "next/og";

// App icon for the installable app. ?size=192|512, ?m=1 for a full-bleed maskable icon.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const size = u.searchParams.get("size") === "512" ? 512 : 192;
  const m = u.searchParams.get("m") === "1";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#4f46e5", color: "#fff", fontSize: size * (m ? 0.4 : 0.5), fontWeight: 800, borderRadius: m ? 0 : size / 5 }}>C1</div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } }
  );
}
