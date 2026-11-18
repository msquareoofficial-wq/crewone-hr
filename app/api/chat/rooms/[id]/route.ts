import { pushTo } from "@/lib/push";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { onlineExpr, todayDate } from "@/lib/hr";

const MAX_FILE = 50 * 1024 * 1024;

async function member(roomId: number, userId: number) {
  return q1("SELECT 1 FROM chat_members WHERE room_id=$1 AND user_id=$2", [roomId, userId]);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  if (!id || !(await member(id, me.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const after = Number(new URL(req.url).searchParams.get("after") || 0);
  const cols = `c.id, c.sender_id, c.body, c.file_url, c.file_name, c.file_size, c.mentions, c.created_at, c.reply_to, rm.body AS reply_body, rm.file_name AS reply_file, ru.name AS reply_name, u.name AS sender_name, (u.picture IS NOT NULL) AS has_picture`;
  const J = "JOIN users u ON u.id=c.sender_id LEFT JOIN chat_messages rm ON rm.id=c.reply_to LEFT JOIN users ru ON ru.id=rm.sender_id";
  const messages = after > 0
    ? await q<any>(`SELECT ${cols} FROM chat_messages c ${J} WHERE c.room_id=$1 AND c.id>$2 ORDER BY c.id LIMIT 200`, [id, after])
    : await q<any>(`SELECT * FROM (SELECT ${cols} FROM chat_messages c ${J} WHERE c.room_id=$1 ORDER BY c.id DESC LIMIT 100) t ORDER BY id`, [id]);
  if (messages.length) await q("UPDATE chat_members SET last_read_id=GREATEST(last_read_id,$3) WHERE room_id=$1 AND user_id=$2", [id, me.id, messages[messages.length - 1].id]);
  const room = await q1<any>("SELECT id, kind, name, created_by FROM chat_rooms WHERE id=$1", [id]);
  const d = await todayDate();
  const members = await q<any>(
    `SELECT u.id, u.name, u.role, u.status_text, m.last_read_id, (u.picture IS NOT NULL) AS has_picture, ${onlineExpr("$2")} AS online
     FROM chat_members m JOIN users u ON u.id=m.user_id WHERE m.room_id=$1 ORDER BY u.name`, [id, d]);
  const reactions = await q<any>("SELECT message_id, user_id, emoji FROM chat_reactions WHERE message_id IN (SELECT id FROM chat_messages WHERE room_id=$1 ORDER BY id DESC LIMIT 100)", [id]);
  return NextResponse.json({ room, members, messages, reactions });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  if (!id || !(await member(id, me.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json();
  if (b.react) {
    const mid = Number(b.react.message_id);
    const emoji = String(b.react.emoji || "").slice(0, 8);
    const msg = mid && emoji ? await q1("SELECT 1 FROM chat_messages WHERE id=$1 AND room_id=$2", [mid, id]) : null;
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    const had = await q1<{ emoji: string }>("SELECT emoji FROM chat_reactions WHERE message_id=$1 AND user_id=$2", [mid, me.id]);
    if (had && had.emoji === emoji) await q("DELETE FROM chat_reactions WHERE message_id=$1 AND user_id=$2", [mid, me.id]);
    else await q("INSERT INTO chat_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3) ON CONFLICT (message_id, user_id) DO UPDATE SET emoji=EXCLUDED.emoji", [mid, me.id, emoji]);
    return NextResponse.json({ ok: true });
  }
  const body = String(b.body || "").trim().slice(0, 4000);
  const f = b.file;
  let file: { url: string; name: string; size: number; type: string } | null = null;
  if (f) {
    const fid = Number(f.id);
    const row = fid ? await q1<{ name: string; size: number; mime: string | null; got: number }>(
      "SELECT f.name, f.size, f.mime, (SELECT COALESCE(SUM(LENGTH(data)),0)::int FROM chat_file_chunks WHERE file_id=f.id) AS got FROM chat_files f WHERE f.id=$1 AND f.uploader_id=$2", [fid, me.id]) : null;
    if (!row) return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    if (row.size > MAX_FILE || row.got !== row.size) return NextResponse.json({ error: "File upload is incomplete, please try again" }, { status: 400 });
    file = { url: `/api/chat/files/${fid}`, name: row.name, size: row.size, type: row.mime || "" };
  }
  if (!body && !file) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  const wanted = Array.isArray(b.mentions) ? b.mentions.map(Number).filter((n: number) => n > 0) : [];
  const mentions = wanted.length ? (await q<{ user_id: number }>("SELECT user_id FROM chat_members WHERE room_id=$1 AND user_id = ANY($2)", [id, wanted])).map((r) => r.user_id) : [];
  const rid = Number(b.reply_to) || 0;
  const replyTo = rid && (await q1("SELECT 1 FROM chat_messages WHERE id=$1 AND room_id=$2", [rid, id])) ? rid : null;
  const m = await q1<{ id: number }>(
    "INSERT INTO chat_messages (room_id, sender_id, body, file_url, file_name, file_size, file_type, mentions, reply_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
    [id, me.id, body || null, file?.url ?? null, file?.name ?? null, file?.size ?? null, file?.type ?? null, mentions, replyTo]);
  await q("UPDATE chat_members SET last_read_id=GREATEST(last_read_id,$3) WHERE room_id=$1 AND user_id=$2", [id, me.id, m!.id]);
  await logActivity(me.id, "chat", file ? "Sent a file in chat" : "Sent a chat message", file ? file.name : `Room #${id}`);
  const others = (await q<{ user_id: number }>("SELECT user_id FROM chat_members WHERE room_id=$1 AND user_id<>$2", [id, me.id])).map((r) => r.user_id);
  await pushTo(others, me.name, body || (file && /^voice-\d+\./.test(file.name) ? "Sent a voice message" : "Sent a file"), `/chat?room=${id}`);
  return NextResponse.json({ id: m!.id });
}

// Group only. { addMembers: [ids] } (creator or admin), { leave: true } (any member).
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  const room = await q1<any>("SELECT id, kind, created_by FROM chat_rooms WHERE id=$1", [id]);
  if (!room || room.kind !== "group" || !(await member(id, me.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json();
  if (b.leave) {
    await q("DELETE FROM chat_members WHERE room_id=$1 AND user_id=$2", [id, me.id]);
    await q("DELETE FROM chat_rooms r WHERE r.id=$1 AND NOT EXISTS (SELECT 1 FROM chat_members m WHERE m.room_id=r.id)", [id]);
    return NextResponse.json({ ok: true });
  }
  if (Array.isArray(b.addMembers)) {
    if (me.role !== "admin" && room.created_by !== me.id) return NextResponse.json({ error: "Only the group creator or admin can add members" }, { status: 403 });
    const ids = Array.from(new Set(b.addMembers.map(Number).filter((n: number) => n > 0)));
    const valid = await q<{ id: number }>("SELECT id FROM users WHERE active=TRUE AND id = ANY($1)", [ids]);
    for (const v of valid) await q("INSERT INTO chat_members (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, v.id]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nothing to do" }, { status: 400 });
}
