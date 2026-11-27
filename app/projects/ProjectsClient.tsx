// Powered By Vistech Force
"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import "../projects.css";

type P = { id: number; name: string; description: string | null; archived: boolean; total: number; done: number; overdue: number; mine: number; members: number };
type U = { id: number; name: string; role: string; emp_id?: string };
type N = { id: number; task_id: number; project_id: number; kind: string; text: string; project: string };

export default function ProjectsClient({ isAdmin }: { isAdmin: boolean }) {
  const [list, setList] = useState<P[] | null>(null);
  const [show, setShow] = useState(false);
  const [notifs, setNotifs] = useState<N[]>([]);
  const load = useCallback(async () => {
    try { const r = await fetch("/api/projects"); if (r.ok) setList((await r.json()).projects); } catch {}
    try { const r = await fetch("/api/projects/notifications"); if (r.ok) setNotifs((await r.json()).items || []); } catch {}
  }, []);
  async function readAll() { await fetch("/api/projects/notifications", { method: "POST" }); setNotifs([]); }
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <span className="mute">{isAdmin ? "All projects" : "Projects you are a member of"}</span>
        <div className="spacer" />
        {isAdmin && <button className="btn" onClick={() => setShow(true)}>+ New project</button>}
      </div>
      {notifs.length > 0 && (
        <div className="card">
          <div className="row"><b>Notifications ({notifs.length})</b><div className="spacer" /><button className="btn sec sm" onClick={readAll}>Mark all read</button></div>
          {notifs.map((n) => (
            <Link key={n.id} href={`/projects/${n.project_id}?task=${n.task_id}`} className="pj-notif">
              <span className="badge b-info">{n.kind === "assigned" ? "Assigned" : n.kind === "mention" ? "Mention" : "Comment"}</span>
              <span style={{ flex: 1 }}>{n.text}</span><span className="mute" style={{ fontSize: 12 }}>{n.project}</span>
            </Link>
          ))}
        </div>
      )}
      {list === null && <p className="mute">Loading...</p>}
      {list && !list.length && (
        <div className="card">
          {isAdmin
            ? <EmptyState icon="projects" title="No projects yet" sub="Click + New project above to create your first project." />
            : <EmptyState icon="projects" title="No projects assigned" sub="You haven't been added to any project yet." />
          }
        </div>
      )}
      <div className="pj-grid">
        {list?.map((p) => {
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="pj-card" style={p.archived ? { opacity: 0.6 } : undefined}>
              <h3>{p.name} {p.archived && <span className="badge b-mute">Archived</span>}</h3>
              <div className="d">{p.description || "No description"}</div>
              <div className="pj-bar"><i style={{ width: `${pct}%` }} /></div>
              <div className="pj-meta">
                <span>{p.done}/{p.total} done ({pct}%)</span>
                <span>{p.members} members</span>
                {p.mine > 0 && <span className="badge b-info">{p.mine} on me</span>}
                {p.overdue > 0 && <span className="badge b-bad">{p.overdue} overdue</span>}
              </div>
            </Link>
          );
        })}
      </div>
      {show && <NewProject onClose={() => setShow(false)} onDone={() => { setShow(false); load(); }} />}
    </>
  );
}

function NewProject({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [users, setUsers] = useState<U[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/chat/users").then((r) => r.json()).then((j) => setUsers(j.users || [])).catch(() => setErr("Could not load users")); }, []);

  async function save() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: desc, memberIds: sel }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) { setErr(j.error || "Could not create project"); setBusy(false); return; }
      onDone();
    } catch { setErr("Network error"); setBusy(false); }
  }

  return createPortal(
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>New project</h3>
        <label>Project name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
        <label style={{ marginTop: 10 }}>Description (optional)</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={2000} />
        <label style={{ marginTop: 10 }}>Members</label>
        <div className="pj-members">
          {users.filter((u) => u.role !== "admin").map((u) => (
            <label key={u.id}><input type="checkbox" checked={sel.includes(u.id)} onChange={() => setSel((s) => (s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id]))} />{u.name}{u.emp_id ? ` (${u.emp_id})` : ""}</label>
          ))}
          {!users.length && <span className="mute">No users found.</span>}
        </div>
        {err && <div className="err">{err}</div>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" disabled={!name.trim() || busy} onClick={save}>Create project</button>
          <button className="btn sec" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
