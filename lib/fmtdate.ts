// Powered By Vistech Force
// Date display helpers. Format: "November 12, 2026". CSV exports stay ISO (YYYY-MM-DD).
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// "2026-11-12" (or a Date/ISO timestamp prefix) -> "November 12, 2026"
export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return "-";
  const s = typeof v === "string" ? v.slice(0, 10) : v.toISOString().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return String(v);
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

// "2026-11" -> "November 2026"
export function fmtMonth(v: string | null | undefined): string {
  if (!v) return "-";
  const m = /^(\d{4})-(\d{2})/.exec(v);
  if (!m) return v;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
