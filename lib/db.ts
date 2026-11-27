// Powered By Vistech Force
import { Pool } from "pg";

const g = globalThis as unknown as { _pool?: Pool };

export const pool =
  g._pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
if (process.env.NODE_ENV !== "production") g._pool = pool;

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const r = await pool.query(text, params);
  return r.rows as T[];
}

export async function q1<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

export type Settings = { timezone: string; grace_minutes: number; lates_per_off: number; leave_quota: number };

export async function getSettings(): Promise<Settings> {
  const rows = await q<{ key: string; value: string }>("SELECT key, value FROM settings");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    timezone: m.timezone || "America/New_York",
    grace_minutes: Number(m.grace_minutes ?? 30),
    lates_per_off: Number(m.lates_per_off ?? 3),
    leave_quota: Number(m.leave_quota ?? 12),
  };
}

export const NAV_KEYS = ["admindash", "users", "notifications", "leaves", "calendar", "corrections", "reports", "performance", "payroll", "finance", "activity", "settings", "credentials"] as const;
export type NavKey = (typeof NAV_KEYS)[number];
export const DEFAULT_NAV_LABELS: Record<NavKey, string> = {
  admindash: "Dashboard", users: "Users", notifications: "Notifications",
  leaves: "Leaves", calendar: "Calendar", corrections: "Corrections",
  reports: "Reports", performance: "Performance", payroll: "Payroll",
  finance: "Finance", activity: "Activity", settings: "Settings",
  credentials: "Credentials",
};
export async function getNavLabels(): Promise<Record<NavKey, string>> {
  const rows = await q<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key LIKE 'nav_%'");
  const m = Object.fromEntries(rows.map((r) => [r.key.slice(4), r.value]));
  return Object.fromEntries(NAV_KEYS.map((k) => [k, m[k]?.trim() || DEFAULT_NAV_LABELS[k]])) as Record<NavKey, string>;
}

export async function getFinUsdColors(): Promise<{ c1: string; c2: string }> {
  const rows = await q<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key IN ('fin_usd_color1', 'fin_usd_color2')");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { c1: m.fin_usd_color1 || "#1d4ed8", c2: m.fin_usd_color2 || "#3b82f6" };
}
