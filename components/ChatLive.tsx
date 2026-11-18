// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Grp = { room_id: number; title: string; count: number; last: string; mentioned: boolean };
type Item = { id: number; room_id: number; title: string; sender: string; text: string; mentioned: boolean };
type S = { total: number; groups: Grp[]; toasts: Item[] };

let state: S = { total: 0, groups: [], toasts: [] };
const subs = new Set<() => void>();
let timer: any = null;
let base: number | null = null;
let ctx: any = null;
const emit = () => subs.forEach((f) => f());

const isMuted = () => { try { return localStorage.getItem("chat_mute") === "1"; } catch { return false; } };
export const setMuted = (v: boolean) => { try { localStorage.setItem("chat_mute", v ? "1" : "0"); } catch {} emit(); };

function unlock() {
  try { const A = (window as any).AudioContext || (window as any).webkitAudioContext; ctx = ctx || new A(); ctx.resume?.(); } catch {}
}
function beep() {
  try {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      const s = t0 + i * 0.16;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.22, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.22);
      o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s + 0.25);
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
    state = { total: j.total || 0, groups: j.groups || [], toasts: state.toasts };
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

export function ChatNavLink() {
  const s = useChat();
  useEffect(() => {
    const clean = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = s.total > 0 ? `(${cnt(s.total)}) ${clean}` : clean;
  }, [s.total]);
  return <Link href="/chat">Chat{s.total > 0 && <span className="nav-badge">{cnt(s.total)}</span>}</Link>;
}

export function ChatWidget() {
  const s = useChat();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  if (path?.startsWith("/chat")) return null;
  return (
    <div className="chat-fab">
      {!open && s.toasts.map((t) => (
        <a key={t.id} className="chat-toast" href={`/chat?room=${t.room_id}`}>
          <b>{t.title}{t.mentioned ? " (mentioned you)" : ""}</b>
          <span>{t.sender}: {t.text}</span>
        </a>
      ))}
      {open && (
        <div className="chat-panel">
          <div className="h"><span style={{ flex: 1 }}>Messages</span>
            <button className="btn sec sm" onClick={() => setMuted(!isMuted())}>{isMuted() ? "Sound off" : "Sound on"}</button>
            <Link className="btn sm" href="/chat">Open chat</Link>
          </div>
          {s.groups.map((g) => (
            <a key={g.room_id} className="it" href={`/chat?room=${g.room_id}`}>
              <div className="meta"><div className="t">{g.title}{g.mentioned ? " (@)" : ""}</div><div className="s">{g.last}</div></div>
              <span className="nav-badge" style={{ margin: 0 }}>{cnt(g.count)}</span>
            </a>
          ))}
          {!s.groups.length && <p className="mute" style={{ padding: 14, margin: 0 }}>No new messages.</p>}
        </div>
      )}
      <button className="chat-fab-btn" onClick={() => setOpen((v) => !v)}>Chat{s.total > 0 && <span className="nav-badge">{cnt(s.total)}</span>}</button>
    </div>
  );
}
