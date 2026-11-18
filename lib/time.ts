// Powered By Vistech Force
// All times are stored as UTC timestamps (server clock, not the user's PC clock).
// They are displayed in the company timezone.

export function localParts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
    month: `${p.year}-${p.month}`,
  };
}

export function hhmmToMinutes(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fmtTime(d: Date | string | null | undefined, tz: string) {
  if (!d) return "-";
  return new Date(d).toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function fmtDateTime(d: Date | string | null | undefined, tz: string) {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-US", { timeZone: tz, month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function fmtDur(seconds: number) {
  seconds = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Minutes late versus the shift start. Works for normal and overnight shifts:
 * a sign-in far "before" the shift start (e.g. 07:55 for a 20:00 shift) is not late.
 */
export function minutesLate(signInMinutes: number, shiftStart: string) {
  const start = hhmmToMinutes(shiftStart);
  let diff = signInMinutes - start;
  if (diff < -720) diff += 1440; // signed in just after midnight on a night shift
  if (diff > 720) diff -= 1440; // signed in just before midnight for an early-morning shift
  return diff;
}

// "17:00" -> "5:00 PM"
export function fmt12(hhmm: string | null | undefined) {
  if (!hhmm) return "-";
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${ap}`;
}
