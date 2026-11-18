// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CommentForm({ id }: { id: number }) {
  const router = useRouter();
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  return (
    <form className="row" style={{ marginTop: 8 }} onSubmit={async (e) => {
      e.preventDefault();
      const r = await fetch(`/api/notifications/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: v }) });
      if (r.ok) { setV(""); setErr(""); router.refresh(); } else setErr((await r.json()).error || "Error");
    }}>
      <input placeholder="Write a comment..." value={v} onChange={(e) => setV(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
      <button className="btn sm" disabled={!v.trim()}>Comment</button>
      {err && <span className="mute">{err}</span>}
    </form>
  );
}

export function DeleteBtn({ url, label = "Delete", confirmText = "Are you sure you want to delete this?" }: { url: string; label?: string; confirmText?: string }) {
  const router = useRouter();
  return (
    <button className="btn bad sm" onClick={async () => { if (confirm(confirmText)) { await fetch(url, { method: "DELETE" }); router.refresh(); } }}>{label}</button>
  );
}

export function EditNotif({ id, title, body }: { id: number; title: string; body: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn sec sm" onClick={() => setOpen(true)}>Edit</button>;
  return (
    <form className="grid" style={{ width: "100%", marginTop: 8 }} onSubmit={async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.currentTarget).entries());
      const r = await fetch(`/api/notifications/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (r.ok) { setOpen(false); router.refresh(); }
    }}>
      <input name="title" defaultValue={title} required />
      <textarea name="body" defaultValue={body} required rows={3} style={{ width: "100%", padding: 9, border: "1px solid var(--line)", borderRadius: 8, font: "inherit" }} />
      <div className="row"><button className="btn sm">Save</button><button type="button" className="btn sec sm" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
