// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Point = { id: number; title: string; body: string; sort_order: number };

function PointRow({ p, onDelete, onSaved }: { p: Point; onDelete: (id: number) => void; onSaved: (p: Point) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [body, setBody] = useState(p.body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{p.title}</div>
        {p.body && <div style={{ fontSize: "0.85rem", color: "var(--mute)", marginTop: 2, whiteSpace: "pre-wrap" }}>{p.body}</div>}
      </div>
      <button type="button" className="btn" style={{ padding: "4px 12px", fontSize: "0.82rem" }} onClick={() => setEditing(true)}>Edit</button>
      <button type="button" className="btn" style={{ padding: "4px 12px", fontSize: "0.82rem", background: "var(--red, #dc2626)", color: "#fff" }} onClick={del} disabled={busy}>Del</button>
    </div>
  );

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Policy title" style={{ width: "100%", marginBottom: 6 }} maxLength={200} />
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Details (optional)" rows={3} style={{ width: "100%", resize: "vertical", marginBottom: 6 }} maxLength={2000} />
      {err && <div className="err" style={{ marginBottom: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn" onClick={save} disabled={busy}>Save</button>
        <button type="button" className="btn" style={{ background: "var(--mute-bg, #f1f5f9)" }} onClick={() => { setEditing(false); setTitle(p.title); setBody(p.body); }}>Cancel</button>
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
      setTitle(""); setBody(""); setMsg("Point added!");
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

      <div style={{ background: "var(--mute-bg, #f8fafc)", borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Add new policy point</div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Policy title *"
          style={{ width: "100%", marginBottom: 8 }}
          maxLength={200}
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Details / description (optional)"
          rows={3}
          style={{ width: "100%", resize: "vertical", marginBottom: 8 }}
          maxLength={2000}
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
