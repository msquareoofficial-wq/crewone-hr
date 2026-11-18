// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { q, q1 } from "@/lib/db";

// First visit creates the marker at "now", so old items never show up as new
async function seen(userId: number, key: string) {
  const r = await q1<{ at: string }>(
    "INSERT INTO user_seen (user_id, key) VALUES ($1,$2) ON CONFLICT (user_id, key) DO UPDATE SET key=EXCLUDED.key RETURNING at", [userId, key]);
  return r!.at;
}

type Item = { key: string; href: string; title: string; text: string };

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tabs: Record<string, number> = {};
  const items: Item[] = [];
  const isAdmin = me.role === "admin";

  // Leave requests waiting for a decision (admin, or a user with the "leaves" right)
  if (can(me, "leaves")) {
    const pend = await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM leave_requests WHERE status='pending'");
    tabs.leaves = pend?.n ?? 0;
    const lv = await q<any>("SELECT l.id, u.name, l.start_date, l.end_date FROM leave_requests l JOIN users u ON u.id=l.user_id WHERE l.status='pending' ORDER BY l.id DESC LIMIT 20");
    for (const l of lv) items.push({ key: `leave-${l.id}`, href: "/admin/leaves", title: "New leave request", text: `${l.name}: ${l.start_date}${l.end_date !== l.start_date ? ` to ${l.end_date}` : ""}` });
  }

  // New comments on notifications
  if (can(me, "notifications")) {
    const at = await seen(me.id, "ann_comments");
    const cn = await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM notification_comments WHERE user_id<>$1 AND created_at > $2", [me.id, at]);
    tabs.notifications = cn?.n ?? 0;
    const cm = await q<any>(
      "SELECT c.id, c.body, u.name, n.title FROM notification_comments c JOIN notifications n ON n.id=c.notification_id JOIN users u ON u.id=c.user_id WHERE c.user_id<>$1 AND c.created_at > $2 ORDER BY c.id DESC LIMIT 20", [me.id, at]);
    for (const c of cm) items.push({ key: `comment-${c.id}`, href: "/admin/notifications", title: `New comment on ${c.title}`.slice(0, 80), text: `${c.name}: ${String(c.body).slice(0, 80)}` });
  }

  // Team dashboard: people who signed in since the last visit
  if (can(me, "dashboard")) {
    const at = await seen(me.id, "att");
    const cn = await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM attendance WHERE user_id<>$1 AND sign_in > $2", [me.id, at]);
    tabs.admindash = cn?.n ?? 0;
    const rows = await q<any>("SELECT a.id, a.late, u.name FROM attendance a JOIN users u ON u.id=a.user_id WHERE a.user_id<>$1 AND a.sign_in > $2 ORDER BY a.id DESC LIMIT 20", [me.id, at]);
    for (const r of rows) items.push({ key: `att-${r.id}`, href: "/admin", title: "Signed in", text: `${r.name}${r.late ? " (late)" : ""}` });
  }

  // New users (admin only)
  if (isAdmin) {
    const at = await seen(me.id, "users");
    const cn = await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM users WHERE id<>$1 AND created_at > $2", [me.id, at]);
    tabs.users = cn?.n ?? 0;
    const rows = await q<any>("SELECT id, name FROM users WHERE id<>$1 AND created_at > $2 ORDER BY id DESC LIMIT 20", [me.id, at]);
    for (const r of rows) items.push({ key: `user-${r.id}`, href: "/admin/users", title: "New user added", text: r.name });
  }

  // Normal users: announcements and leave decisions on My Dashboard
  if (!isAdmin) {
    const aAt = await seen(me.id, "ann");
    const lAt = await seen(me.id, "leave");
    const ann = await q<any>(
      "SELECT id, title FROM notifications WHERE author_id<>$1 AND created_at > $2 AND kind<>'holiday' AND (audience='all' OR audience=(SELECT department FROM users WHERE id=$1)) ORDER BY id DESC LIMIT 20", [me.id, aAt]);
    const lv = await q<any>("SELECT id, status FROM leave_requests WHERE user_id=$1 AND status<>'pending' AND decided_at > $2 ORDER BY id DESC LIMIT 20", [me.id, lAt]);
    tabs.dashboard = ann.length + lv.length;
    for (const a of ann) items.push({ key: `ann-${a.id}`, href: "/dashboard", title: "New announcement", text: a.title });
    for (const l of lv) items.push({ key: `lv-${l.id}`, href: "/dashboard", title: "Leave request update", text: `Your leave was ${l.status}` });
  }

  // Calendar: new holidays (everyone)
  {
    const at = await seen(me.id, "cal");
    const hol = await q<any>(
      `SELECT n.id, MIN(h.title) AS title, MIN(h.holiday_date) AS d FROM holidays h JOIN notifications n ON n.id=h.notification_id
       WHERE n.author_id<>$1 AND n.created_at > $2 AND ($3::boolean OR n.audience='all' OR n.audience=(SELECT department FROM users WHERE id=$1))
       GROUP BY n.id ORDER BY n.id DESC LIMIT 20`, [me.id, at, isAdmin]);
    tabs.calendar = hol.length;
    for (const h of hol) items.push({ key: `hol-${h.id}`, href: "/calendar", title: "New holiday", text: `${h.title} (${h.d})` });
  }

  return NextResponse.json({ tabs, items });
}

// Visiting a tab marks its items as seen (the leaves count is state based, so it is never marked)
const SEEN_KEYS: Record<string, string[]> = {
  notifications: ["ann_comments"],
  dashboard: ["ann", "leave"],
  admindash: ["att"],
  users: ["users"],
  calendar: ["cal"],
};

export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  for (const k of SEEN_KEYS[String(b.tab)] ?? [])
    await q("INSERT INTO user_seen (user_id, key) VALUES ($1,$2) ON CONFLICT (user_id, key) DO UPDATE SET at=now()", [me.id, k]);
  return NextResponse.json({ ok: true });
}
