// Powered By Vistech Force
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { q, q1 } from "./db";

const COOKIE = "hr_session";
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

export type SessionUser = {
  id: number;
  emp_id: string;
  role: "admin" | "user";
  name: string;
  pseudo_name: string | null;
  department: string | null;
  shift_start: string;
  shift_end: string;
  shift_type: string;
  picture: string | null;
  perms: string[];
  designation: string | null;
  status_text: string | null;
};

// Rights an admin can hand to a normal user (e.g. head of sales, head of production).
export const PERMS = [
  { key: "dashboard", label: "Team dashboard (who is present / absent)" },
  { key: "leaves", label: "Approve or reject leave requests" },
  { key: "reports", label: "Attendance reports and CSV" },
  { key: "notifications", label: "Post notifications and holidays" },
] as const;
export const PERM_KEYS: string[] = PERMS.map((p) => p.key);

export function can(u: { role: string; perms?: string[] | null } | null | undefined, perm: string) {
  return !!u && (u.role === "admin" || (u.perms ?? []).includes(perm));
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("12h").sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = await q1<SessionUser>(
      "SELECT id, emp_id, role, name, pseudo_name, department, shift_start, shift_end, shift_type, picture, perms, designation, status_text FROM users WHERE id=$1 AND active=TRUE",
      [payload.uid]
    );
    if (u) await q("UPDATE users SET last_seen=now() WHERE id=$1 AND (last_seen IS NULL OR last_seen < now() - interval '1 minute')", [u.id]);
    return u;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const u = await getSession();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdminPage(perm?: string) {
  const u = await requireUser();
  if (perm ? !can(u, perm) : u.role !== "admin") redirect("/dashboard");
  return u;
}

export function getIp(req: Request) {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  return (xff ? xff.split(",")[0].trim() : h.get("x-real-ip")) || "unknown";
}
