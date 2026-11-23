// Powered By Vistech Force
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MAX_FILE = 50 * 1024 * 1024;
const EMOJIS = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","🙂","😉","😍","😘","😎","🤩","🥳","🙏","👍","👎","👏","🙌","💪","👌","✌️","🤞","👋","❤️","🧡","💛","💚","💙","💜","🔥","⭐","✨","🎉","✅","❌","⚠️","💯","☕","🎂","🚀","😢","😭","😤","😡","🤯","😱","🥺","🤒","🤔","😐","😶","🙄","😴","😷","🤐","😬","🤭"];
const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const isVoice = (n: string | null) => !!n && /^voice-\d+\.(webm|m4a|ogg)$/.test(n);
const isImg   = (n: string | null) => !!n && /\.(png|jpe?g|gif|webp|bmp)$/i.test(n);
const IcClip  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.4 11.1l-9.2 9.2a6 6 0 01-8.5-8.5l9.2-9.2a4 4 0 015.7 5.7l-9.2 9.2a2 2 0 01-2.8-2.8l8.5-8.5"/></svg>;
const IcSmile = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/></svg>;
const IcMic   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v4"/></svg>;
const IcSend  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;

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
  const [cwProgress, setCwProgress] = useState<number | null>(null);
  const [cwRecSecs, setCwRecSecs]   = useState<number | null>(null);
  const [cwEmoji, setCwEmoji]       = useState(false);
  const lastId    = useRef(0);
  const endRef    = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const cwFileRef = useRef<HTMLInputElement>(null);
  const cwRecRef   = useRef<{ mr: MediaRecorder; stream: MediaStream; chunks: Blob[]; cancelled: boolean } | null>(null);
  const sendingRef = useRef(false);
  const cwRecTimer= useRef<any>(null);
  const cwOnFile  = useRef<(f: File) => void>(() => {});

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
    if (!active || !text.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const body = text.trim();
    setText(""); // Clear immediately — prevents duplicate sends on rapid Enter
    try {
      await fetch(`/api/chat/rooms/${active.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      await fetchMsgs(active.id, false);
    } catch { setText(body); }
    finally { sendingRef.current = false; setSending(false); }
    inputRef.current?.focus();
  }

  /* file upload */
  async function cwUploadFile(f: File) {
    if (f.size > MAX_FILE) return;
    setCwProgress(0); setCwEmoji(false);
    try {
      const r = await fetch("/api/chat/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, size: f.size, type: f.type || "application/octet-stream" }) });
      const j = await r.json();
      if (!r.ok) throw new Error();
      const CH = 3 * 1024 * 1024;
      for (let i = 0, off = 0; off < f.size; i++, off += CH) {
        const pr = await fetch(`/api/chat/files/${j.id}?idx=${i}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: f.slice(off, off + CH) });
        if (!pr.ok) throw new Error();
        setCwProgress(Math.min(100, Math.round(((off + CH) / f.size) * 100)));
      }
      if (!active) return;
      await fetch(`/api/chat/rooms/${active.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file: { id: j.id } }) });
      await fetchMsgs(active.id, false);
    } catch {}
    setCwProgress(null);
    if (cwFileRef.current) cwFileRef.current.value = "";
  }
  cwOnFile.current = cwUploadFile;

  /* voice recording */
  async function cwStartRec() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mt = ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"].find(t => (MediaRecorder as any).isTypeSupported?.(t));
      const mr = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
      const st = { mr, stream, chunks: [] as Blob[], cancelled: false };
      mr.ondataavailable = e => { if (e.data.size) st.chunks.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(cwRecTimer.current); setCwRecSecs(null); cwRecRef.current = null;
        if (st.cancelled || !st.chunks.length) return;
        const type = (mr.mimeType || mt || "audio/webm").split(";")[0];
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        cwOnFile.current(new File(st.chunks, `voice-${Date.now()}.${ext}`, { type }));
      };
      cwRecRef.current = st; mr.start();
      const t0 = Date.now(); setCwRecSecs(0);
      cwRecTimer.current = setInterval(() => { const n = Math.floor((Date.now() - t0) / 1000); setCwRecSecs(n); if (n >= 300) cwStopRec(false); }, 500);
    } catch {}
  }
  function cwStopRec(cancel: boolean) {
    const st = cwRecRef.current; if (!st) return;
    st.cancelled = cancel;
    if (st.mr.state !== "inactive") st.mr.stop();
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
                    {m.file_url && isVoice(m.file_name) && (
                      <CwVoice url={m.file_url} name={m.file_name!} />
                    )}
                    {m.file_url && !isVoice(m.file_name) && (
                      <div className="cw-bubble" style={{ padding: 0, overflow: "hidden" }}>
                        {isImg(m.file_name) && /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.file_url} alt={m.file_name ?? ""} style={{ maxWidth: 220, maxHeight: 160, display: "block", borderRadius: 10 }} />}
                        {!isImg(m.file_name) && <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 12px", textDecoration: "none", color: "inherit" }}>📎 {m.file_name}</a>}
                      </div>
                    )}
                    <div className="cw-time">{time(m.created_at)}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {cwProgress !== null && <div className="cw-upload-bar"><div className="cw-upload-fill" style={{ width: `${cwProgress}%` }} /></div>}
              {cwRecSecs !== null ? (
                <div className="cw-rec">
                  <span className="cw-rec-dot">●</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{fmtSecs(cwRecSecs)}</span>
                  <button type="button" className="cw-ic-btn" onClick={() => cwStopRec(true)} title="Cancel">✕</button>
                  <button type="button" className="cw-send-btn" onClick={() => cwStopRec(false)} title="Send voice"><IcSend /></button>
                </div>
              ) : (
              <form className="cw-input" onSubmit={e => { e.preventDefault(); send(); }}>
                <input ref={cwFileRef} type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) cwOnFile.current(f); }} />
                <button type="button" className="cw-ic-btn" onClick={() => cwFileRef.current?.click()} title="Attach file" disabled={cwProgress !== null}><IcClip /></button>
                <div style={{ position: "relative" }}>
                  <button type="button" className="cw-ic-btn" onClick={() => setCwEmoji(v => !v)} title="Emoji"><IcSmile /></button>
                  {cwEmoji && (
                    <div className="cw-emoji-pop">
                      {EMOJIS.map(e => <button key={e} type="button" onClick={() => { setText(t => t + e); setCwEmoji(false); inputRef.current?.focus(); }}>{e}</button>)}
                    </div>
                  )}
                </div>
                <input
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Type a message…"
                  disabled={sending || cwProgress !== null}
                  autoFocus
                />
                {text.trim()
                  ? <button type="submit" disabled={sending || cwProgress !== null} className="cw-send-btn"><IcSend /></button>
                  : <button type="button" className="cw-send-btn" onClick={cwStartRec} disabled={cwProgress !== null} title="Voice message"><IcMic /></button>}
              </form>
              )}
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

function CwVoice({ url, name }: { url: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const r = await fetch(url); if (!r.ok) throw new Error();
      const type = name.endsWith(".m4a") ? "audio/mp4" : name.endsWith(".ogg") ? "audio/ogg" : "audio/webm";
      setSrc(URL.createObjectURL(new Blob([await r.arrayBuffer()], { type })));
    } catch {}
    setBusy(false);
  }
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  if (src) return <audio controls autoPlay src={src} style={{ maxWidth: 220, display: "block" }} />;
  return <button type="button" className="cw-bubble" style={{ border: "none", cursor: "pointer", background: "#f1f5f9", color: "var(--ink)" }} disabled={busy} onClick={load}>{busy ? "Loading…" : "▶ Voice message"}</button>;
}
