// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { onlineExpr, todayDate } from "@/lib/hr";

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rooms = await q<any>(
    `SELECT r.id, r.kind, r.name, r.created_by,
       (SELECT COUNT(*)::int FROM chat_members x WHERE x.room_id=r.id) AS member_count,
       (SELECT COUNT(*)::int FROM chat_messages c WHERE c.room_id=r.id AND c.id>m.last_read_id AND c.sender_id<>$1) AS unread,
       lm.body AS last_body, lm.file_name AS last_file, lm.created_at AS last_at
     FROM chat_rooms r JOIN chat_members m ON m.room_id=r.id AND m.user_id=$1
     LEFT JOIN LATERAL (SELECT body, file_name, created_at FROM chat_messages WHERE room_id=r.id ORDER BY id DESC LIMIT 1) lm ON TRUE
     ORDER BY COALESCE(lm.created_at, r.created_at) DESC`, [me.id]);
  const dmIds = rooms.filter((r) => r.kind === "dm").map((r) => r.id);
  const others: Record<number, any> = {};
  if (dmIds.length) {
    const d = await todayDate();
    const rows = await q<any>(
      `SELECT m.room_id, u.id, u.name, u.status_text, (u.picture IS NOT NULL) AS has_picture, ${onlineExpr("$2")} AS online
       FROM chat_members m JOIN users u ON u.id=m.user_id WHERE m.room_id = ANY($1) AND m.user_id<>$3`, [dmIds, d, me.id]);
    for (const r of rows) others[r.room_id] = r;
  }
  return NextResponse.json({
    rooms: rooms.map((r) => {
      const o = others[r.id];
      return {
        id: r.id, kind: r.kind, title: r.kind === "dm" ? o?.name ?? "Deleted user" : r.name, member_count: r.member_count, unread: r.unread,
        last_body: r.last_body, last_file: r.last_file, last_at: r.last_at,
        other_id: o?.id ?? null, status_text: o?.status_text ?? null, has_picture: !!o?.has_picture, online: o ? !!o.online : null,
      };
    }),
  });
}

// { userId } opens (or creates) a direct chat. { name, memberIds } creates a group.
export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (b.userId) {
    const other = Number(b.userId);
    if (!other || other === me.id) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    const u = await q1("SELECT id FROM users WHERE id=$1 AND active=TRUE", [other]);
    if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const key = [me.id, other].sort((x, y) => x - y).join(":");
    const room = await q1<{ id: number }>(
      "INSERT INTO chat_rooms (kind, dm_key, created_by) VALUES ('dm',$1,$2) ON CONFLICT (dm_key) DO UPDATE SET dm_key=EXCLUDED.dm_key RETURNING id", [key, me.id]);
    await q("INSERT INTO chat_members (room_id, user_id) VALUES ($1,$2),($1,$3) ON CONFLICT DO NOTHING", [room!.id, me.id, other]);
    return NextResponse.json({ id: room!.id });
  }
  const name = String(b.name || "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "Enter a group name" }, { status: 400 });
  const ids = Array.from(new Set((Array.isArray(b.memberIds) ? b.memberIds : []).map(Number).filter((n: number) => n > 0 && n !== me.id)));
  if (!ids.length) return NextResponse.json({ error: "Select at least one member" }, { status: 400 });
  const valid = await q<{ id: number }>("SELECT id FROM users WHERE active=TRUE AND id = ANY($1)", [ids]);
  const room = await q1<{ id: number }>("INSERT INTO chat_rooms (kind, name, created_by) VALUES ('group',$1,$2) RETURNING id", [name, me.id]);
  for (const id of [me.id, ...valid.map((v) => v.id)]) await q("INSERT INTO chat_members (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [room!.id, id]);
  return NextResponse.json({ id: room!.id });
}
