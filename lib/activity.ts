// Powered By Vistech Force
import { q } from "./db";

export const ACT_CATS = ["auth", "attendance", "break", "task", "leave", "project", "chat", "profile"] as const;

// Never throws: logging must not break the real action.
export async function logActivity(userId: number | null | undefined, category: (typeof ACT_CATS)[number], action: string, detail?: string | null, ip?: string | null) {
  try {
    await q("INSERT INTO activity_log (user_id, category, action, detail, ip) VALUES ($1,$2,$3,$4,$5)", [userId ?? null, category, action.slice(0, 200), detail ? String(detail).slice(0, 500) : null, ip ?? null]);
  } catch {}
}
