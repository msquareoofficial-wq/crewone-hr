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
