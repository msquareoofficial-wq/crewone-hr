// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type It = { key: string; href: string; title: string; text: string };
type S = { tabs: Record<string, number>; toasts: It[]; items: It[] };

let state: S = { tabs: {}, toasts: [], items: [] };
const subs = new Set<() => void>();
let timer: any = null;
let known: Set<string> | null = null;
let ctx: any = null;
const emit = () => subs.forEach((f) => f());
const MARKABLE = ["notifications", "dashboard", "admindash", "users", "calendar"];

const isMuted = () => { try { return localStorage.getItem("chat_mute") === "1"; } catch { return false; } };
function unlock() {
  try { const A = (window as any).AudioContext || (window as any).webkitAudioContext; ctx = ctx || new A(); ctx.resume?.(); } catch {}
}
function beep() {
  try {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [660, 990].forEach((f, i) => {
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
    const r = await fetch("/api/live");
    if (!r.ok) return;
    const j = await r.json();
    const items: It[] = j.items || [];
    const keys = new Set(items.map((i) => i.key));
    let fresh: It[] = [];
    if (known === null) known = keys;
    else {
      const here = window.location.pathname;
      fresh = items.filter((i) => !known!.has(i.key) && !(here === i.href || (i.href !== "/admin" && here.startsWith(i.href))));
      keys.forEach((k) => known!.add(k));
    }
    state = { tabs: j.tabs || {}, toasts: state.toasts, items };
    if (fresh.length) {
      if (!isMuted()) beep();
      state.toasts = [...state.toasts, ...fresh].slice(-3);
      const ks = fresh.map((f) => f.key);
      setTimeout(() => { state = { ...state, toasts: state.toasts.filter((t) => !ks.includes(t.key)) }; emit(); }, 7000);
    }
    emit();
  } catch {}
}

async function markTab(tab: string) {
  try { await fetch("/api/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tab }) }); } catch {}
  await poll();
}

function useLive() {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((x) => x + 1);
    subs.add(cb);
    if (!timer) { poll(); timer = setInterval(poll, 8000); }
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => { subs.delete(cb); if (!subs.size) { clearInterval(timer); timer = null; } };
  }, []);
  return state;
}

const cnt = (n: number) => (n > 99 ? "99+" : String(n));

export function LiveNavLink({ tab, href, label, exact }: { tab: string; href: string; label: string; exact?: boolean }) {
  const s = useLive();
  const path = usePathname();
  const n = s.tabs[tab] || 0;
  const on = !!path && (exact ? path === href : path.startsWith(href));
  useEffect(() => { if (on && n > 0 && MARKABLE.includes(tab)) markTab(tab); }, [on, n, tab]);
  return <Link href={href}>{label}{n > 0 && <span className="nav-badge">{cnt(n)}</span>}</Link>;
}

export function LiveToasts() {
  const s = useLive();
  return (
    <div className="live-toasts">
      {s.toasts.map((t) => (
        <a key={t.key} className="chat-toast" href={t.href}><b>{t.title}</b><span>{t.text}</span></a>
      ))}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function NotifBell() {
  const s = useLive();
  const [open, setOpen] = useState(false);
  const n = s.items.length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.(".bell")) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function markAll() {
    for (const t of MARKABLE) { if ((s.tabs[t] || 0) > 0) await markTab(t); }
  }

  return (
    <div className="bell">
      <button type="button" className="bell-btn" aria-label="Notifications" aria-expanded={open} title="Notifications" onClick={() => setOpen((o) => !o)}>
        <BellIcon />
        {n > 0 && <span className="bell-badge">{cnt(n)}</span>}
      </button>
      {open && (
        <div className="bell-pop" role="dialog" aria-label="Notifications">
          <div className="bell-head">
            <b>Notifications</b>
            {n > 0 && <button type="button" onClick={markAll}>Mark all read</button>}
          </div>
          <div className="bell-list">
            {n === 0 && <div className="bell-empty">You are all caught up.</div>}
            {s.items.map((i) => (
              <Link key={i.key} href={i.href} className="bell-item" onClick={() => setOpen(false)}>
                <b>{i.title}</b>
                <span>{i.text}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
