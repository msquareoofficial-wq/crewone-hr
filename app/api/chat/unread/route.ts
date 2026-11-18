// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";

const FROM = `FROM chat_messages c JOIN chat_members m ON m.room_id=c.room_id AND m.user_id=$1 JOIN chat_rooms r ON r.id=c.room_id JOIN users u ON u.id=c.sender_id
  WHERE c.id>m.last_read_id AND c.sender_id<>$1`;
const preview = (body: string | null, file: string | null) => (file ? `File: ${file}` : (body ?? "")).slice(0, 80);

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await q1<{ n: number }>(`SELECT COUNT(*)::int AS n ${FROM}`, [me.id]);
  const groups = await q<any>(
    `SELECT r.id AS room_id, r.kind, r.name, COUNT(*)::int AS count, bool_or(c.mentions @> ARRAY[$1::int]) AS mentioned,
       (array_agg(c.body ORDER BY c.id DESC))[1] AS last_body, (array_agg(c.file_name ORDER BY c.id DESC))[1] AS last_file, (array_agg(u.name ORDER BY c.id DESC))[1] AS last_sender
     ${FROM} GROUP BY r.id ORDER BY MAX(c.id) DESC LIMIT 8`, [me.id]);
  const items = await q<any>(
    `SELECT c.id, c.room_id, c.body, c.file_name, u.name AS sender, r.kind, r.name AS rname, (c.mentions @> ARRAY[$1::int]) AS mentioned ${FROM} ORDER BY c.id DESC LIMIT 10`, [me.id]);
  return NextResponse.json({
    total: t?.n ?? 0,
    groups: groups.map((g) => ({ room_id: g.room_id, title: g.kind === "dm" ? g.last_sender : g.name, count: g.count, last: `${g.last_sender}: ${preview(g.last_body, g.last_file)}`, mentioned: g.mentioned })),
    items: items.map((i) => ({ id: i.id, room_id: i.room_id, title: i.kind === "dm" ? i.sender : i.rname, sender: i.sender, text: preview(i.body, i.file_name), mentioned: i.mentioned })),
  });
}
