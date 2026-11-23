// Powered By Vistech Force
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ── shared types ── */
type Grp  = { room_id: number; title: string; count: number; last: string; mentioned: boolean };
type Item = { id: number; room_id: number; title: string; sender: string; text: string; mentioned: boolean };
type S    = { total: number; groups: Grp[]; toasts: Item[] };
type Room = { id: number; kind: "dm"|"group"; title: string; unread: number; last_body: string|null; last_at: string|null; other_id: number|null; has_picture: boolean; online: boolean|null };
type Msg  = { id: number; sender_id: number; sender_name: string; body: string|null; file_url: string|null; file_name: string|null; created_at: string };

/* ── global poll state ── */
let state: S = { total: 0, groups: [], toasts: [] };
const subs = new Set<() => void>();
let timer: any = null;
let base: number|null = null;
let ctx: any = null;
const emit = () => subs.forEach((f) => f());

const isMuted = () => { try { return localStorage.getItem("chat_mute") === "1"; } catch { return false; } };
export const setMuted = (v: boolean) => { try { localStorage.setItem("chat_mute", v ? "1" : "0"); } catch {} emit(); };

function unlock() {
  try { const A = (window as any).AudioContext || (window as any).webkitAudioContext; ctx = ctx||new A(); ctx.resume?.(); } catch {}
}
function beep() {
  try {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      const s = t0 + i * 0.16;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.22, s+0.02); g.gain.exponentialRampToValueAtTime(0.0001, s+0.22);
      o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s+0.25);
    });
  } catch {}
}

async function poll() {
  try {
    const r = await fetch("/api/chat/unread");
    if (!r.ok) return;
    const j = await r.json();
    const items: Item[] = j.items || [];
    const max = items.reduce((a, i) => Math.max(a, i.id), 0);
    const active = (window as any).__activeChatRoom;
    let fresh: Item[] = [];
    if (base === null) base = max;
    else {
      fresh = items.filter((i) => i.id > base! && i.room_id !== active);
      if (max > base) base = max;
    }
    state = { total: j.total||0, groups: j.groups||[], toasts: state.toasts };
    if (fresh.length) {
      if (!isMuted()) beep();
      state.toasts = [...state.toasts, ...fresh].slice(-3);
      const ids = fresh.map((f) => f.id);
      setTimeout(() => { state = { ...state, toasts: state.toasts.filter((t) => !ids.includes(t.id)) }; emit(); }, 7000);
    }
    emit();
  } catch {}
}

function useChat() {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((x) => x + 1);
    subs.add(cb);
    if (!timer) { poll(); timer = setInterval(poll, 5000); }
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => { subs.delete(cb); if (!subs.size) { clearInterval(timer); timer = null; } };
  }, []);
  return state;
}

const cnt = (n: number) => (n > 99 ? "99+" : String(n));

/* ── nav chat link ── */
export function ChatNavLink() {
  const s = useChat();
  useEffect(() => {
    const clean = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = s.total > 0 ? `(${cnt(s.total)}) ${clean}` : clean;
  }, [s.total]);
  return <Link href="/chat">Chat{s.total > 0 && <span className="nav-badge">{cnt(s.total)}</span>}</Link>;
}

/* ── avatar ── */
function Av({ id, name, hasPic, online, size = 36 }: { id?: number|null; name: string; hasPic?: boolean; online?: boolean|null; size?: number }) {
  const st = { width: size, height: size };
  return (
    <span className="av-wrap" style={st}>
      {hasPic && id
        // eslint-disable-next-line @next/next/no-img-element
        ? <img className="avatar" style={st} src={`/api/avatar/${id}`} alt="" />
        : <span className="avatar" style={st}>{name.slice(0,1).toUpperCase()}</span>}
      {online !== undefined && online !== null && <i className={`dot ${online ? "on" : "off"}`} />}
    </span>
  );
}

/* ── main chat widget ── */
export function ChatWidget() {
  const s      = useChat();
  const path   = usePathname();
  const [open, setOpen]       = useState(false);
  const [rooms, setRooms]     = useState<Room[]>([]);
  const [active, setActive]   = useState<Room|null>(null);
  const [msgs, setMsgs]       = useState<Msg[]>([]);
  const [text, setText]       = useState("");
  const [sending, setSending] = useState(false);
  const [meId, setMeId]       = useState<number|null>(null);
  const lastId   = useRef(0);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* fetch current user id once */
  useEffect(() => {
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(j => { if (j?.id) setMeId(j.id); }).catch(() => {});
  }, []);

  /* load rooms when panel opens */
  const loadRooms = useCallback(async () => {
    try { const r = await fetch("/api/chat/rooms"); if (r.ok) setRooms((await r.json()).rooms || []); } catch {}
  }, []);

  useEffect(() => { if (open) { loadRooms(); const t = setInterval(loadRooms, 5000); return () => clearInterval(t); } }, [open, loadRooms]);

  /* load messages for active room */
  const fetchMsgs = useCallback(async (roomId: number, reset: boolean) => {
    try {
      const r = await fetch(`/api/chat/rooms/${roomId}?after=${reset ? 0 : lastId.current}`);
      if (!r.ok) return;
      const j = await r.json();
      if (reset) setMsgs(j.messages || []);
      else if (j.messages?.length) setMsgs(p => [...p, ...j.messages]);
      if (j.messages?.length) { lastId.current = j.messages[j.messages.length-1].id; loadRooms(); }
    } catch {}
  }, [loadRooms]);

  useEffect(() => {
    if (!active) return;
    lastId.current = 0; setMsgs([]);
    fetchMsgs(active.id, true);
    (window as any).__activeChatRoom = active.id;
    const t = setInterval(() => fetchMsgs(active.id, false), 3000);
    return () => { clearInterval(t); (window as any).__activeChatRoom = null; };
  }, [active, fetchMsgs]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  /* send */
  async function send() {
    if (!active || !text.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`/api/chat/rooms/${active.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });
      setText("");
      await fetchMsgs(active.id, false);
    } catch {} finally { setSending(false); }
    inputRef.current?.focus();
  }

  const time = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  /* hide on /chat page */
  if (path?.startsWith("/chat")) return null;

  return (
    <div className="cw-fab">
      {/* toast notifications (shown when panel is closed) */}
      {!open && s.toasts.map(t => (
        <div key={t.id} className="cw-toast" onClick={() => { setOpen(true); const rm = rooms.find(r => r.id === t.room_id); if (rm) setActive(rm); }}>
          <b>{t.title}{t.mentioned ? " (@)" : ""}</b>
          <span>{t.sender}: {t.text}</span>
        </div>
      ))}

      {/* panel */}
      {open && (
        <div className="cw-panel">
          {/* header */}
          <div className="cw-panel-head">
            {active ? (
              <>
                <button className="cw-back" onClick={() => { setActive(null); setMsgs([]); }} title="Back">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <Av id={active.other_id} name={active.title} hasPic={active.has_picture} online={active.online} size={28} />
                <span className="cw-name">{active.title}</span>
                <Link className="cw-open-btn" href={`/chat?room=${active.id}`} title="Open full chat" onClick={() => setOpen(false)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </Link>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontWeight: 700 }}>Messages</span>
                <button className="cw-mute-btn" onClick={() => setMuted(!isMuted())} title={isMuted() ? "Unmute sounds" : "Mute sounds"}>
                  {isMuted()
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>}
                </button>
                <Link className="cw-open-btn" href="/chat" onClick={() => setOpen(false)} title="Open full chat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </Link>
              </>
            )}
            <button className="cw-close" onClick={() => { setOpen(false); setActive(null); setMsgs([]); }} title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* room list */}
          {!active && (
            <div className="cw-rooms">
              {rooms.map(r => (
                <div key={r.id} className={`cw-room-item${r.unread > 0 ? " unread" : ""}`} onClick={() => setActive(r)}>
                  {r.kind === "dm"
                    ? <Av id={r.other_id} name={r.title} hasPic={r.has_picture} online={r.online} />
                    : <span className="avatar" style={{ width: 36, height: 36, flexShrink: 0 }}>G</span>}
                  <div className="cw-meta">
                    <div className="cw-t">{r.title}</div>
                    <div className="cw-s">{r.last_body ?? "No messages yet"}</div>
                  </div>
                  {r.unread > 0 && <span className="nav-badge" style={{ margin: 0 }}>{cnt(r.unread)}</span>}
                </div>
              ))}
              {!rooms.length && <p className="mute" style={{ padding: "14px 16px", margin: 0, fontSize: 13 }}>No chats yet.</p>}
            </div>
          )}

          {/* messages */}
          {active && (
            <>
              <div className="cw-msgs">
                {msgs.map(m => (
                  <div key={m.id} className={`cw-msg${m.sender_id === meId ? " me" : ""}`}>
                    {m.body && <div className="cw-bubble">{m.body}</div>}
                    {m.file_url && m.file_name && (
                      <a className="cw-bubble cw-file" href={m.file_url} target="_blank" rel="noopener noreferrer">
                        📎 {m.file_name}
                      </a>
                    )}
                    <div className="cw-time">{time(m.created_at)}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form className="cw-input" onSubmit={e => { e.preventDefault(); send(); }}>
                <input
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Type a message…"
                  disabled={sending}
                  autoFocus
                />
                <button type="submit" disabled={!text.trim() || sending} className="cw-send-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* floating button */}
      <button className={`cw-btn${open ? " active" : ""}`} onClick={() => { setOpen(v => !v); if (!open) loadRooms(); }}>
        {open
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>}
        {!open && s.total > 0 && <span className="cw-badge">{cnt(s.total)}</span>}
      </button>
    </div>
  );
}
