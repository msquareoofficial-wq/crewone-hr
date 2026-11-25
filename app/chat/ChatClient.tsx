// Powered By Vistech Force
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import EmptyState from "@/components/EmptyState";

// Powered By Vistech Force
type U = { id: number; name: string; emp_id?: string; role?: string; has_picture: boolean; online: boolean; last_read_id?: number; status_text?: string | null };
type Rx = { message_id: number; user_id: number; emoji: string };
type Room = { id: number; kind: "dm" | "group"; title: string; member_count: number; unread: number; last_body: string | null; last_file: string | null; last_at: string | null; other_id: number | null; has_picture: boolean; online: boolean | null; status_text?: string | null };
type Msg = { id: number; sender_id: number; sender_name: string; body: string | null; file_url: string | null; file_name: string | null; file_size: number | null; mentions?: number[]; created_at: string; reply_to?: number | null; reply_body?: string | null; reply_file?: string | null; reply_name?: string | null };
type RoomInfo = { id: number; kind: "dm" | "group"; name: string | null; created_by: number | null };

const MAX = 50 * 1024 * 1024;
const fmtSize = (n: number | null) => (n == null ? "" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const QUICK = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"];

const EMOJIS = ["\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}", "\u{1F606}", "\u{1F605}", "\u{1F602}", "\u{1F923}", "\u{1F60A}", "\u{1F642}", "\u{1F609}", "\u{1F60D}", "\u{1F618}", "\u{1F60E}", "\u{1F929}", "\u{1F973}", "\u{1F607}", "\u{1F917}", "\u{1F914}", "\u{1F610}", "\u{1F60F}", "\u{1F62C}", "\u{1F644}", "\u{1F634}", "\u{1F622}", "\u{1F62D}", "\u{1F624}", "\u{1F621}", "\u{1F92F}", "\u{1F631}", "\u{1F97A}", "\u{1F637}", "\u{1F44D}", "\u{1F44E}", "\u{1F44F}", "\u{1F64C}", "\u{1F4AA}", "\u{1F44C}", "\u{270C}\u{FE0F}", "\u{1F91E}", "\u{1F44B}", "\u{1F64F}", "\u{2764}\u{FE0F}", "\u{1F494}", "\u{1F525}", "\u{2B50}", "\u{2728}", "\u{1F389}", "\u{2705}", "\u{274C}", "\u{26A0}\u{FE0F}", "\u{1F4AF}", "\u{2615}", "\u{1F382}", "\u{1F680}"];
const IcMic = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v4" /></svg>);
const IcClip = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.4 11.1l-9.2 9.2a6 6 0 01-8.5-8.5l9.2-9.2a4 4 0 015.7 5.7l-9.2 9.2a2 2 0 01-2.8-2.8l8.5-8.5" /></svg>);
const IcSmile = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></svg>);
const Tick = ({ one, read }: { one: boolean; read: boolean }) => (
  <svg className={`tick ${read ? "read" : ""}`} width="17" height="11" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label={read ? "Read" : one ? "Sent" : "Delivered"}>
    <path d="M1.5 6.5l3.5 3.5L11.5 2" />
    {!one && <path d="M7.5 9.2l.8.8L16 2" />}
  </svg>
);
const isVoice = (n: string | null) => !!n && /^voice-\d+\.(webm|m4a|ogg)$/.test(n);
const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const isImg = (n: string | null) => !!n && /\.(png|jpe?g|gif|webp|bmp)$/i.test(n);

function Av({ id, name, has, online, size = 36 }: { id?: number | null; name: string; has?: boolean; online?: boolean | null; size?: number }) {
  const st = { width: size, height: size };
  return (
    <span className="av-wrap" style={st}>
      {has && id ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="avatar" style={st} src={`/api/avatar/${id}`} alt="" /> : <span className="avatar" style={st}>{name.slice(0, 1).toUpperCase()}</span>}
      {online !== undefined && online !== null && <i className={`dot ${online ? "on" : "off"}`} />}
    </span>
  );
}

export default function ChatClient({ meId, meRole, tz, initialRoom }: { meId: number; meRole: string; tz: string; initialRoom: number | null }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [active, setActive] = useState<number | null>(initialRoom);
  const [tagged, setTagged] = useState<{ id: number; name: string }[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [members, setMembers] = useState<U[]>([]);
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [reactions, setReactions] = useState<Rx[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ mr: MediaRecorder; stream: MediaStream; chunks: Blob[]; cancelled: boolean } | null>(null);
  const recTimer = useRef<any>(null);
  const onFileRef = useRef<(f: File) => void>(() => {});
  const [recSecs, setRecSecs] = useState<number | null>(null);
  const sendingRef = useRef(false);

  const loadRooms = useCallback(async () => {
    try { const r = await fetch("/api/chat/rooms"); if (r.ok) setRooms((await r.json()).rooms); } catch {}
  }, []);
  useEffect(() => { loadRooms(); const t = setInterval(loadRooms, 5000); return () => clearInterval(t); }, [loadRooms]);

  const fetchMsgs = useCallback(async (room: number, reset: boolean) => {
    try {
      const r = await fetch(`/api/chat/rooms/${room}?after=${reset ? 0 : lastId.current}`);
      if (!r.ok) return;
      const j = await r.json();
      setMembers(j.members); setInfo(j.room); setReactions(j.reactions || []);
      if (reset) setMsgs(j.messages); else if (j.messages.length) setMsgs((p) => [...p, ...j.messages]);
      if (j.messages.length) { lastId.current = j.messages[j.messages.length - 1].id; loadRooms(); }
    } catch {}
  }, [loadRooms]);

  useEffect(() => {
    if (!active) return;
    lastId.current = 0; setMsgs([]); setShowMembers(false); setErr(""); setReplyTo(null); setSel(null); setShowEmoji(false); setReactions([]);
    fetchMsgs(active, true);
    const t = setInterval(() => fetchMsgs(active, false), 3000);
    return () => clearInterval(t);
  }, [active, fetchMsgs]);

  useEffect(() => { (window as any).__activeChatRoom = active; return () => { (window as any).__activeChatRoom = null; }; }, [active]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length, active]);

  async function send(file?: { id: number }) {
    if (!active || sendingRef.current) return;
    const body = text.trim();
    if (!body && !file) return;
    sendingRef.current = true;
    // Clear immediately so rapid Enter presses don't re-send
    setText(""); setTagged([]); setErr(""); setReplyTo(null); setShowEmoji(false);
    try {
      const r = await fetch(`/api/chat/rooms/${active}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, file, reply_to: replyTo?.id, mentions: tagged.filter((t) => body.includes("@" + t.name)).map((t) => t.id) }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) { setText(body); return setErr(j.error || "Could not send"); }
      await fetchMsgs(active, false);
    } catch { setText(body); setErr("Network error"); }
    finally { sendingRef.current = false; }
  }

  async function onFile(f: File) {
    if (f.size > MAX) return setErr("File is too large (max 50 MB)");
    setErr(""); setProgress(0);
    try {
      const type = f.type || "application/octet-stream";
      const r = await fetch("/api/chat/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, size: f.size, type }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) throw new Error(j.error || "Upload failed");
      const CH = 3 * 1024 * 1024;
      for (let i = 0, off = 0; off < f.size; i++, off += CH) {
        const pr = await fetch(`/api/chat/files/${j.id}?idx=${i}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: f.slice(off, off + CH) });
        if (!pr.ok) throw new Error("Upload failed, please try again");
        setProgress(Math.min(100, Math.round(((off + CH) / f.size) * 100)));
      }
      await send({ id: j.id });
    } catch (e: any) { setErr(e?.message || "Upload failed"); }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  onFileRef.current = onFile;
  async function startRec() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setErr("Voice recording is not supported on this browser");
    try {
      setErr("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mt = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => (MediaRecorder as any).isTypeSupported?.(t));
      const mr = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
      const st = { mr, stream, chunks: [] as Blob[], cancelled: false };
      mr.ondataavailable = (e) => { if (e.data.size) st.chunks.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recTimer.current); setRecSecs(null); recRef.current = null;
        if (st.cancelled || !st.chunks.length) return;
        const type = (mr.mimeType || mt || "audio/webm").split(";")[0];
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onFileRef.current(new File(st.chunks, `voice-${Date.now()}.${ext}`, { type }));
      };
      recRef.current = st; mr.start();
      const t0 = Date.now(); setRecSecs(0);
      recTimer.current = setInterval(() => { const n = Math.floor((Date.now() - t0) / 1000); setRecSecs(n); if (n >= 300) stopRec(false); }, 500);
    } catch { setErr("Microphone access was blocked. Please allow the microphone and try again."); }
  }
  function stopRec(cancel: boolean) {
    const st = recRef.current;
    if (!st) return;
    st.cancelled = cancel;
    if (st.mr.state !== "inactive") st.mr.stop();
  }
  useEffect(() => () => { clearInterval(recTimer.current); recRef.current?.stream.getTracks().forEach((t) => t.stop()); }, []);

  async function react(mid: number, emoji: string) {
    if (!active) return;
    setSel(null);
    try { await fetch(`/api/chat/rooms/${active}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ react: { message_id: mid, emoji } }) }); } catch {}
    await fetchMsgs(active, false);
  }
  const jump = (id: number) => { const el = document.getElementById("m" + id); if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1200); } };
  function tickFor(m: Msg) {
    const others = members.filter((x) => x.id !== meId);
    if (!others.length) return null;
    const read = others.every((x) => (x.last_read_id ?? 0) >= m.id);
    const delivered = read || others.some((x) => x.online);
    return <Tick one={!delivered} read={read} />;
  }

  async function openRoom(id: number) { setShowNew(false); await loadRooms(); setActive(id); }

  const cur = rooms.find((r) => r.id === active);
  const title = cur?.title ?? info?.name ?? "";
  const time = (d: string) => new Date(d).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const mq = (() => { const i = text.lastIndexOf("@"); if (i < 0 || (i > 0 && !/\s/.test(text[i - 1]))) return null; const f = text.slice(i + 1); if (f.length > 20 || f.includes("\n") || f.endsWith(" ")) return null; return { i, f }; })();
  const cands = mq ? members.filter((m) => m.id !== meId && m.name.toLowerCase().includes(mq.f.toLowerCase())).slice(0, 6) : [];
  const pickTag = (m: U) => { if (!mq) return; setText(text.slice(0, mq.i) + "@" + m.name + " "); setTagged((t) => (t.some((x) => x.id === m.id) ? t : [...t, { id: m.id, name: m.name }])); };
  const names = members.map((m) => m.name).sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const renderBody = (b: string) => names.length ? b.split(new RegExp("(@(?:" + names.join("|") + "))", "g")).map((p, i) => (i % 2 ? <span key={i} className="mention">{p}</span> : p)) : b;
  const canAdd = info?.kind === "group" && (meRole === "admin" || info.created_by === meId);

  return (
    <div className="chat">
      <div className="chat-side">
        <div className="chat-head"><b style={{ flex: 1 }}>Chats</b><button className="btn sm" onClick={() => setShowNew(true)}>+ New</button></div>
        <div className="chat-list">
          {rooms.map((r) => (
            <div key={r.id} className={`chat-item ${r.id === active ? "act" : ""}`} onClick={() => setActive(r.id)}>
              {r.kind === "dm" ? <Av id={r.other_id} name={r.title} has={r.has_picture} online={r.online} /> : <span className="avatar" style={{ width: 36, height: 36 }}>G</span>}
              <div className="meta">
                <div className="t">{r.title}{r.kind === "group" && <span className="mute" style={{ fontWeight: 400 }}> ({r.member_count})</span>}</div>
                <div className="s">{r.last_file ? (isVoice(r.last_file) ? "Voice message" : `File: ${r.last_file}`) : r.last_body ?? "No messages yet"}</div>
              </div>
              {r.unread > 0 && <span className="unread">{r.unread}</span>}
            </div>
          ))}
          {!rooms.length && <EmptyState icon="chat" title="No chats yet" sub="Click + New above to start a conversation." compact />}
        </div>
      </div>

      <div className="chat-main">
        {!active ? <EmptyState icon="chat" title="Select a conversation" sub="Choose a chat from the left, or start a new one." /> : (
          <>
            <div className="chat-head">
              {cur?.kind === "dm" ? <Av id={cur.other_id} name={title} has={cur.has_picture} online={cur.online} /> : <span className="avatar" style={{ width: 36, height: 36 }}>G</span>}
              <div style={{ flex: 1, minWidth: 0 }}><b>{title}</b>{cur?.kind === "dm" && <div className="mute" style={{ fontSize: 12 }}>{cur.status_text || (cur.online ? "Active" : "Inactive")}</div>}</div>
              {info?.kind === "group" && <button className="btn sec sm" onClick={() => setShowMembers((v) => !v)}>Members ({members.length})</button>}
            </div>
            {showMembers && info?.kind === "group" && (
              <GroupPanel roomId={active} members={members} canAdd={!!canAdd} onChanged={() => fetchMsgs(active, false)} onLeft={() => { setActive(null); loadRooms(); }} />
            )}
            <div className="msgs">
              {msgs.map((m) => (
                <div key={m.id} id={"m" + m.id} className={`msg ${m.sender_id === meId ? "me" : ""} ${m.mentions?.includes(meId) ? "mentioned" : ""} ${sel === m.id ? "sel" : ""}`} onClick={() => setSel((s) => (s === m.id ? null : m.id))}>
                  {info?.kind === "group" && m.sender_id !== meId && <div className="who">{m.sender_name}</div>}
                  {m.reply_to && m.reply_name && <div className="quote" onClick={(e) => { e.stopPropagation(); jump(m.reply_to!); }}><b>{m.reply_name}</b><span>{m.reply_body || (m.reply_file ? `\u{1F4CE} ${m.reply_file}` : "")}</span></div>}
                  {m.file_url && isVoice(m.file_name) && <VoiceMsg url={m.file_url} name={m.file_name!} />}
                  {m.file_url && !isVoice(m.file_name) && (
                    <div>
                      {isImg(m.file_name) && /* eslint-disable-next-line @next/next/no-img-element */ <a href={m.file_url} target="_blank" rel="noopener noreferrer"><img src={m.file_url} alt={m.file_name ?? ""} style={{ maxWidth: 260, maxHeight: 220, borderRadius: 8, display: "block" }} /></a>}
                      <div className="file">
                        <span>{"\u{1F4CE}"}</span>
                        <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{m.file_name}</div><div className="mute" style={{ fontSize: 11 }}>{fmtSize(m.file_size)}</div></div>
                        <a className="btn sec sm" href={`${m.file_url}?download=1`}>Download</a>
                      </div>
                    </div>
                  )}
                  {m.body && <div style={{ whiteSpace: "pre-wrap" }}>{renderBody(m.body)}</div>}
                  {(() => {
                    const mine = reactions.filter((r) => r.message_id === m.id);
                    if (!mine.length) return null;
                    const groups = Array.from(new Set(mine.map((r) => r.emoji)));
                    return <div className="rxs">{groups.map((e) => { const n = mine.filter((r) => r.emoji === e).length; const me = mine.some((r) => r.emoji === e && r.user_id === meId); return <span key={e} className={`rx ${me ? "mine" : ""}`} onClick={(ev) => { ev.stopPropagation(); react(m.id, e); }}>{e}{n > 1 ? ` ${n}` : ""}</span>; })}</div>;
                  })()}
                  <div className="tm">{time(m.created_at)}{m.sender_id === meId && tickFor(m)}</div>
                  {sel === m.id && (
                    <div className="msg-actions" onClick={(e) => e.stopPropagation()}>
                      {QUICK.map((e) => <button key={e} type="button" onClick={() => react(m.id, e)}>{e}</button>)}
                      <button type="button" className="rep" onClick={() => { setReplyTo(m); setSel(null); inputRef.current?.focus(); }}>Reply</button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {err && <div className="err" style={{ margin: "0 10px" }}>{err}</div>}
            {progress !== null && <div className="mute" style={{ padding: "0 14px 6px" }}>Uploading file... {progress}%</div>}
            {replyTo && (
              <div className="replybar"><div className="quote" style={{ flex: 1, margin: 0 }}><b>Replying to {replyTo.sender_id === meId ? "yourself" : replyTo.sender_name}</b><span>{replyTo.body || (replyTo.file_name ? `\u{1F4CE} ${replyTo.file_name}` : "")}</span></div><button type="button" className="btn sec sm" onClick={() => setReplyTo(null)}>x</button></div>
            )}
            {recSecs !== null ? (
              <div className="chat-input">
                <span style={{ color: "var(--bad)", fontWeight: 700 }}>&#9679; Recording {fmtSecs(recSecs)}</span>
                <div style={{ flex: 1 }} />
                <button type="button" className="btn sec" onClick={() => stopRec(true)}>Cancel</button>
                <button type="button" className="btn" onClick={() => stopRec(false)}>Send voice message</button>
              </div>
            ) : (
            <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
              <button type="button" className="btn sec ic" disabled={progress !== null} title="Attach a file (max 50 MB)" onClick={() => fileRef.current?.click()}><IcClip /></button>
              <div style={{ position: "relative" }}>
                <button type="button" className="btn sec ic" title="Emoji" onClick={() => setShowEmoji((v) => !v)}><IcSmile /></button>
                {showEmoji && <div className="emoji-pop">{EMOJIS.map((e) => <button key={e} type="button" onClick={() => { setText((t) => t + e); inputRef.current?.focus(); }}>{e}</button>)}</div>}
              </div>
              <div style={{ flex: 1, position: "relative" }}>
                {cands.length > 0 && <div className="mention-list">{cands.map((c) => <div key={c.id} onMouseDown={(e) => { e.preventDefault(); pickTag(c); }}>@{c.name}</div>)}</div>}
                <input ref={inputRef} placeholder="Type a message... (@ to tag someone)" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              {text.trim() ? <button className="btn" disabled={progress !== null}>Send</button> : <button type="button" className="btn ic" title="Record a voice message" disabled={progress !== null} onClick={startRec}><IcMic /></button>}
            </form>
            )}
          </>
        )}
      </div>

      {showNew && <NewChat onClose={() => setShowNew(false)} onOpen={openRoom} />}
    </div>
  );
}

function GroupPanel({ roomId, members, canAdd, onChanged, onLeft }: { roomId: number; members: U[]; canAdd: boolean; onChanged: () => void; onLeft: () => void }) {
  const [users, setUsers] = useState<U[]>([]);
  const [pick, setPick] = useState("");
  useEffect(() => { if (canAdd) fetch("/api/chat/users").then((r) => r.json()).then((j) => setUsers(j.users || [])).catch(() => {}); }, [canAdd]);
  const free = users.filter((u) => !members.some((m) => m.id === u.id));
  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", background: "#fafbfd" }}>
      <div className="row">{members.map((m) => <span key={m.id} className="row" style={{ gap: 6 }}><Av id={m.id} name={m.name} has={m.has_picture} online={m.online} size={26} />{m.name}</span>)}</div>
      <div className="row" style={{ marginTop: 10 }}>
        {canAdd && free.length > 0 && (
          <>
            <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ width: 200 }}><option value="">Add member...</option>{free.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
            <button className="btn sm" disabled={!pick} onClick={async () => { await fetch(`/api/chat/rooms/${roomId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addMembers: [Number(pick)] }) }); setPick(""); onChanged(); }}>Add</button>
          </>
        )}
        <div className="spacer" />
        <button className="btn bad sm" onClick={async () => { if (confirm("Leave this group?")) { await fetch(`/api/chat/rooms/${roomId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leave: true }) }); onLeft(); } }}>Leave group</button>
      </div>
    </div>
  );
}

function NewChat({ onClose, onOpen }: { onClose: () => void; onOpen: (id: number) => void }) {
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [users, setUsers] = useState<U[]>([]);
  const [filter, setFilter] = useState("");
  const [name, setName] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => { fetch("/api/chat/users").then((r) => r.json()).then((j) => setUsers(j.users || [])).catch(() => setErr("Could not load users")); }, []);
  const list = users.filter((u) => u.name.toLowerCase().includes(filter.toLowerCase()));

  async function post(body: any) {
    const r = await fetch("/api/chat/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j: any = {}; try { j = await r.json(); } catch {}
    if (!r.ok) return setErr(j.error || "Error");
    onOpen(j.id);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 10 }}>
          <button className={`btn sm ${tab === "dm" ? "" : "sec"}`} onClick={() => setTab("dm")}>Direct message</button>
          <button className={`btn sm ${tab === "group" ? "" : "sec"}`} onClick={() => setTab("group")}>New group</button>
          <div className="spacer" /><button className="btn sec sm" onClick={onClose}>Close</button>
        </div>
        {tab === "group" && <div style={{ marginBottom: 10 }}><label>Group name</label><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>}
        <input placeholder="Search users..." value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 8 }} />
        {list.map((u) => (
          <div key={u.id} className="chat-item" style={{ borderRadius: 8 }} onClick={() => (tab === "dm" ? post({ userId: u.id }) : setSel((s) => (s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id])))}>
            {tab === "group" && <input type="checkbox" checked={sel.includes(u.id)} readOnly style={{ width: "auto" }} />}
            <Av id={u.id} name={u.name} has={u.has_picture} online={u.online} />
            <div className="meta"><div className="t">{u.name}</div><div className="s">{u.status_text || (u.role === "admin" ? "Admin" : u.emp_id)}</div></div>
          </div>
        ))}
        {!list.length && <p className="mute">No users found.</p>}
        {err && <div className="err">{err}</div>}
        {tab === "group" && <div style={{ marginTop: 12 }}><button className="btn" disabled={!name.trim() || !sel.length} onClick={() => post({ name, memberIds: sel })}>Create group ({sel.length})</button></div>}
      </div>
    </div>
  );
}
function VoiceMsg({ url, name }: { url: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  async function load() {
    setBusy(true); setBad(false);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("x");
      const type = name.endsWith(".m4a") ? "audio/mp4" : name.endsWith(".ogg") ? "audio/ogg" : "audio/webm";
      setSrc(URL.createObjectURL(new Blob([await r.arrayBuffer()], { type })));
    } catch { setBad(true); }
    setBusy(false);
  }
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  if (src) return <audio controls autoPlay src={src} style={{ maxWidth: 240, display: "block" }} onClick={(e) => e.stopPropagation()} />;
  return <button type="button" className="btn sec sm" disabled={busy} onClick={(e) => { e.stopPropagation(); load(); }}>{busy ? "Loading..." : bad ? "Could not load, tap to retry" : "\u25B6 Voice message"}</button>;
}
