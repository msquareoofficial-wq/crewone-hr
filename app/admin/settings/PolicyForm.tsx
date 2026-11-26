// Powered By Vistech Force
"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Point = { id: number; title: string; body: string; sort_order: number };

function insertAround(ta: HTMLTextAreaElement, before: string, after: string, sample: string) {
  const { selectionStart: s, selectionEnd: e } = ta;
  const sel = ta.value.slice(s, e) || sample;
  ta.focus();
  ta.setRangeText(before + sel + after, s, e, "select");
  return ta.value;
}

function insertBullet(ta: HTMLTextAreaElement) {
  const { selectionStart: s, value } = ta;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  if (value.slice(lineStart, lineStart + 2) === "- ") {
    ta.setRangeText("", lineStart, lineStart + 2, "end");
  } else {
    ta.setRangeText("- ", lineStart, lineStart, "end");
  }
  return ta.value;
}

function Toolbar({ taRef, onChange }: { taRef: React.RefObject<HTMLTextAreaElement | null>; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
      <button type="button" title="Wrap selection in **bold**" onClick={() => { if (taRef.current) onChange(insertAround(taRef.current, "**", "**", "bold text")); }}
        style={{ padding: "3px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", lineHeight: 1.4 }}>B</button>
      <button type="button" title="Toggle bullet on current line" onClick={() => { if (taRef.current) onChange(insertBullet(taRef.current)); }}
        style={{ padding: "3px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", fontSize: "0.85rem", cursor: "pointer", lineHeight: 1.4 }}>• Bullet</button>
      <span style={{ fontSize: "0.73rem", color: "var(--mute)" }}>**bold** · - bullet line</span>
    </div>
  );
}

function PointRow({ p, index, onDelete, onSaved }: { p: Point; index: number; onDelete: (id: number) => void; onSaved: (p: Point) => void }) {
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
    if (!confirm(`Delete "${p.title}"?`)) return;
    setBusy(true);
    await fetch(`/api/policy/${p.id}`, { method: "DELETE" });
    onDelete(p.id);
  }

  return (
    <div style={{
      border: "1px solid var(--line)", borderRadius: 10, marginBottom: 10,
      background: editing ? "var(--card)" : "var(--bg, #f8fafc)",
      overflow: "hidden",
    }}>
      {/* Header row — always visible */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
        <span style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          minWidth: 28, height: 28, borderRadius: "50%",
          background: "var(--brand, #4f46e5)", color: "#fff",
          fontWeight: 700, fontSize: "0.82rem", flexShrink: 0,
        }}>{index + 1}</span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: "0.95rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
        {!editing && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button type="button" className="btn sec sm" onClick={() => setEditing(true)} disabled={busy}>Edit</button>
            <button type="button" className="btn sm" style={{ background: "#dc2626", color: "#fff", border: "none" }} onClick={del} disabled={busy}>Delete</button>
          </div>
        )}
      </div>

      {/* Body preview — only when not editing */}
      {!editing && p.body && (
        <div style={{ padding: "0 14px 12px 52px", fontSize: "0.83rem", color: "var(--mute)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {p.body.length > 160 ? p.body.slice(0, 160) + "…" : p.body}
        </div>
      )}

      {/* Edit form — only when editing */}
      {editing && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--line)" }}>
          <label style={{ fontSize: "0.78rem", color: "var(--mute)", display: "block", marginBottom: 4, marginTop: 10 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Policy title" style={{ width: "100%", marginBottom: 10 }} maxLength={200} />
          <label style={{ fontSize: "0.78rem", color: "var(--mute)", display: "block", marginBottom: 4 }}>Details (optional)</label>
          <Toolbar taRef={taRef} onChange={setBody} />
          <textarea
            ref={taRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={"Details / description (optional)\nUse **bold text** or start a line with - for bullet"}
            rows={5}
            style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: "0.88rem", marginBottom: 10 }}
            maxLength={3000}
          />
          {err && <div className="err" style={{ marginBottom: 10 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
            <button type="button" className="btn sec" onClick={() => { setEditing(false); setTitle(p.title); setBody(p.body); setErr(""); }}>Cancel</button>
          </div>
        </div>
      )}
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
  const [showAdd, setShowAdd] = useState(false);
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
      setTitle(""); setBody(""); setMsg("Point added — all employees notified!"); setShowAdd(false);
      router.refresh();
    } else { setErr(j.error || "Failed"); }
  }

  return (
    <div>
      {/* Existing points */}
      {points.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--mute)", fontSize: "0.9rem" }}>
          No policy points yet. Add your first one below.
        </div>
      )}

      {points.map((p, i) => (
        <PointRow
          key={p.id}
          p={p}
          index={i}
          onDelete={id => { setPoints(prev => prev.filter(x => x.id !== id)); router.refresh(); }}
          onSaved={updated => { setPoints(prev => prev.map(x => x.id === updated.id ? updated : x)); router.refresh(); }}
        />
      ))}

      {msg && <div className="okmsg" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* Add new — toggled */}
      {!showAdd ? (
        <button type="button" className="btn" onClick={() => { setShowAdd(true); setMsg(""); }} style={{ marginTop: points.length ? 4 : 0 }}>
          + Add policy point
        </button>
      ) : (
        <div style={{ border: "1px solid var(--brand, #4f46e5)", borderRadius: 10, padding: 16, marginTop: 8, background: "var(--card)" }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: "0.95rem" }}>New policy point</div>
          <label style={{ fontSize: "0.78rem", color: "var(--mute)", display: "block", marginBottom: 4 }}>Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Working Hours Policy"
            style={{ width: "100%", marginBottom: 10 }}
            maxLength={200}
            autoFocus
          />
          <label style={{ fontSize: "0.78rem", color: "var(--mute)", display: "block", marginBottom: 4 }}>Details (optional)</label>
          <Toolbar taRef={taRef} onChange={setBody} />
          <textarea
            ref={taRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={"Details / description (optional)\nUse **bold text** or start a line with - for bullet"}
            rows={5}
            style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: "0.88rem", marginBottom: 10 }}
            maxLength={3000}
          />
          {err && <div className="err" style={{ marginBottom: 10 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" onClick={add} disabled={busy}>{busy ? "Adding…" : "Add point"}</button>
            <button type="button" className="btn sec" onClick={() => { setShowAdd(false); setTitle(""); setBody(""); setErr(""); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
