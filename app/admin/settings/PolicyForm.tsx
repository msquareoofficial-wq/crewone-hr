// Powered By Vistech Force
"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Point = { id: number; title: string; body: string; sort_order: number };

function insertAround(ta: HTMLTextAreaElement, before: string, after: string, sample: string) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const sel = value.slice(s, e) || sample;
  const next = value.slice(0, s) + before + sel + after + value.slice(e);
  ta.focus();
  ta.setRangeText(before + sel + after, s, e, "select");
  return next;
}

function insertBullet(ta: HTMLTextAreaElement) {
  const { selectionStart: s, value } = ta;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  const line = value.slice(lineStart, s);
  if (line.startsWith("- ")) {
    const next = value.slice(0, lineStart) + value.slice(lineStart + 2);
    ta.setRangeText("", lineStart, lineStart + 2, "end");
    return next;
  }
  ta.setRangeText("- ", lineStart, lineStart, "end");
  return value.slice(0, lineStart) + "- " + value.slice(lineStart);
}

function Toolbar({ taRef, onChange }: { taRef: React.RefObject<HTMLTextAreaElement | null>; onChange: (v: string) => void }) {
  function bold() {
    if (!taRef.current) return;
    insertAround(taRef.current, "**", "**", "bold text");
    onChange(taRef.current.value);
  }
  function bullet() {
    if (!taRef.current) return;
    insertBullet(taRef.current);
    onChange(taRef.current.value);
  }
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
      <button type="button" title="Bold (**text**)" onClick={bold}
        style={{ padding: "2px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>B</button>
      <button type="button" title="Bullet point (- text)" onClick={bullet}
        style={{ padding: "2px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", fontSize: "0.85rem", cursor: "pointer" }}>• List</button>
      <span style={{ fontSize: "0.75rem", color: "var(--mute)", alignSelf: "center", marginLeft: 4 }}>**bold** · - bullet</span>
    </div>
  );
}

function PointRow({ p, onDelete, onSaved }: { p: Point; onDelete: (id: number) => void; onSaved: (p: Point) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [body, setBody] = useState(p.body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  async function save() {
    if (!title.trim()) { setErr("Title required"); return; }
    setBusy(true); setErr("");
    const r = await fetch(`/api/policy/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, sort_order: p.sort_order }),
    });
    setBusy(false);
    if (r.ok) { onSaved({ ...p, title, body }); setEditing(false); }
    else { const j = await r.json(); setErr(j.error || "Failed"); }
  }

  async function del() {
    if (!confirm("Delete this policy point?")) return;
    setBusy(true);
    await fetch(`/api/policy/${p.id}`, { method: "DELETE" });
    onDelete(p.id);
  }

  if (!editing) return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--border, var(--line))" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{p.title}</div>
        {p.body && <div style={{ fontSize: "0.82rem", color: "var(--mute)", marginTop: 2 }}>{p.body.slice(0, 120)}{p.body.length > 120 ? "…" : ""}</div>}
      </div>
      <button type="button" className="btn sec sm" onClick={() => setEditing(true)}>Edit</button>
      <button type="button" className="btn sm" style={{ background: "#dc2626", color: "#fff" }} onClick={del} disabled={busy}>Del</button>
    </div>
  );

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border, var(--line))" }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Policy title" style={{ width: "100%", marginBottom: 6 }} maxLength={200} />
      <Toolbar taRef={taRef} onChange={setBody} />
      <textarea ref={taRef} value={body} onChange={e => setBody(e.target.value)} placeholder="Details (optional) — use **bold** or - bullet" rows={4} style={{ width: "100%", resize: "vertical", marginBottom: 6, fontFamily: "monospace", fontSize: "0.9rem" }} maxLength={3000} />
      {err && <div className="err" style={{ marginBottom: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn" onClick={save} disabled={busy}>Save</button>
        <button type="button" className="btn sec" onClick={() => { setEditing(false); setTitle(p.title); setBody(p.body); }}>Cancel</button>
      </div>
    </div>
  );
}

export default function PolicyForm({ initial }: { initial: Point[] }) {
  const router = useRouter();
  const [points, setPoints] = useState<Point[]>(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  async function add() {
    if (!title.trim()) { setErr("Title required"); return; }
    setBusy(true); setErr(""); setMsg("");
    const r = await fetch("/api/policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const j = await r.json();
    setBusy(false);
    if (r.ok) {
      setPoints(prev => [...prev, { id: j.id, title: title.trim(), body: body.trim(), sort_order: prev.length + 1 }]);
      setTitle(""); setBody(""); setMsg("Point added — all employees notified!");
      router.refresh();
    } else { setErr(j.error || "Failed"); }
  }

  return (
    <div>
      {points.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {points.map(p => (
            <PointRow
              key={p.id}
              p={p}
              onDelete={id => { setPoints(prev => prev.filter(x => x.id !== id)); router.refresh(); }}
              onSaved={updated => { setPoints(prev => prev.map(x => x.id === updated.id ? updated : x)); router.refresh(); }}
            />
          ))}
        </div>
      )}

      <div style={{ background: "var(--mute-bg, var(--bg))", border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Add new policy point</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Policy title *" style={{ width: "100%", marginBottom: 8 }} maxLength={200} />
        <Toolbar taRef={taRef} onChange={setBody} />
        <textarea
          ref={taRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={"Details / description (optional)\nUse **bold text** or start a line with - for bullet"}
          rows={4}
          style={{ width: "100%", resize: "vertical", marginBottom: 8, fontFamily: "monospace", fontSize: "0.9rem" }}
          maxLength={3000}
        />
        {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
        {msg && <div className="okmsg" style={{ marginBottom: 8 }}>{msg}</div>}
        <button type="button" className="btn" onClick={add} disabled={busy}>
          {busy ? "Adding…" : "Add policy point"}
        </button>
      </div>
    </div>
  );
}
