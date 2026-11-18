// Powered By Vistech Force
import { q } from "./db";

// Branding for TechMinds Digital. To use a local copy instead, put the files in /public
// and change these to "/logo-white.png" and "/logo-dark.png".
export const BRAND = {
  name: "TechMinds Digital",
  logoLight: process.env.NEXT_PUBLIC_LOGO_LIGHT || "https://techmindsdigital.co/wp-content/uploads/2025/05/white-1.png", // for dark backgrounds
  logoDark: process.env.NEXT_PUBLIC_LOGO_DARK || "https://techmindsdigital.co/wp-content/uploads/2025/05/black-1.png", // for light backgrounds
  poweredBy: "Vistech Force",
  poweredByUrl: "https://www.vistechforce.com",
};

// Logos uploaded by the admin (Settings page) are stored in the settings table and served from /api/logo/<variant>.
// If none is uploaded, the default logo URLs above are used.
export async function getBrandLogos() {
  const rows = await q<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key IN ('logo_light','logo_dark','logo_version')");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const v = m.logo_version || "0";
  return {
    light: m.logo_light ? `/api/logo/light?v=${v}` : BRAND.logoLight,
    dark: m.logo_dark ? `/api/logo/dark?v=${v}` : BRAND.logoDark,
    customLight: !!m.logo_light,
    customDark: !!m.logo_dark,
  };
}
