"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import "../../projects.css";
import { fmtDate } from "@/lib/fmtdate";
import ImageCropper from "@/components/ImageCropper";

// Powered By Vistech Force
const GRADS: [string, string][] = [["#e0e7ff", "#fce7f3"], ["#dbeafe", "#dcfce7"], ["#fef3c7", "#fee2e2"], ["#1e3a8a", "#6d28d9"], ["#0f172a", "#334155"], ["#065f46", "#0e7490"]];
const SOLIDS = ["#f8fafc", "#fef9c3", "#dcfce7", "#dbeafe", "#fce7f3", "#e5e7eb", "#1f2937"];
function bgCss(bg: string | null): React.CSSProperties {
  if (!bg) return {};
  if (bg.startsWith("c:")) return { background: bg.slice(2) };
  if (bg.startsWith("g:")) { const [a, b] = bg.slice(2).split(","); return { background: `linear-gradient(135deg, ${a}, ${b})` }; }
  if (bg.startsWith("i:")) return { backgroundImage: `url(${bg.slice(2)})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" };
  return {};
}

type ColT = { key: string; name: string };
type BoardT = { id: number; name: string; cols: ColT[] };
type Member = { id: number; name: string; role: string; has_picture: boolean };
type Task = { id: number; board_id: number | null; title: string; status: string; priority: string; assignee_id: number | null; created_by: number | null; due_date: string | null; labels: string[]; comments: number; files: number; ck_total: number; ck_done: number; spent: number; running: boolean; recur: string | null; blocked_by: number[]; blocked: boolean };
type Data = { project: { id: number; name: string; description: string | null; archived: boolean }; members: Member[]; memberIds: number[]; tasks: Task[]; users: { id: number; name: string; role: string }[]; boards: BoardT[] };
type Detail = {
  task: Task & { description: string | null };
  comments: { id: number; body: string; created_at: string; name: string | null }[];
  files: { id: number; name: string; size: number; user_id: number | null }[];
  checklist: { id: number; text: string; done: boolean }[];
  activity: { id: number; text: string; created_at: string; name: string | null }[];
  deps: { id: number; title: string; status: string }[];
  time: { total: number; byUser: { name: string; seconds: number }[]; running: boolean };
};

const PRIOS = ["low", "medium", "high", "urgent"];
const PCOL: Record<string, string> = { low: "#e5e7eb", medium: "#dbeafe", high: "#fef3c7", urgent: "#fee2e2" };
const MAX = 50 * 1024 * 1024;
const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const fmtDur = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : m ? `${m}m ${s % 60}s` : `${s}s`; };
const clock = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function Av({ m, size = 22 }: { m?: Member; size?: number }) {
  if (!m) return null;
  const st = { width: size, height: size, fontSize: size * 0.5 };
  // eslint-disable-next-line @next/next/no-img-element
  return m.has_picture ? <img className="avatar" style={st} src={`/api/avatar/${m.id}`} alt="" /> : <span className="avatar" style={st}>{m.name.slice(0, 1).toUpperCase()}</span>;
}

export default function BoardClient({ projectId, meId, meRole, tz, initialTask }: { projectId: number; meId: number; meRole: string; tz: string; initialTask: number | null }) {
  const [data, setData] = useState<Data | null>(null);
  const [gone, setGone] = useState(false);
  const [view, setView] = useState<"board" | "list" | "calendar">("board");
  const [fA, setFA] = useState("all");
  const [fP, setFP] = useState("all");
  const [fL, setFL] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ id: number | null; status: string } | null>(initialTask ? { id: initialTask, status: "todo" } : null);
  const [manage, setManage] = useState(false);
  const [bg, setBg] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [activeBoard, setActiveBoard] = useState<number | null>(null);
  const [nameBox, setNameBox] = useState<{ title: string; initial: string; onSave: (n: string) => void } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const [cal, setCal] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 });
  const busy = useRef(false);
  const isAdmin = meRole === "admin";

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/${projectId}`);
      if (r.status === 404) return setGone(true);
      if (r.ok) setData(await r.json());
    } catch {}
  }, [projectId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch(`/api/projects/${projectId}/bg`).then((r) => r.json()).then((j) => setBg(j.bg ?? null)).catch(() => {}); }, [projectId]);
  useEffect(() => {
    const t = setInterval(() => { if (!busy.current) load(); }, 8000);
    return () => clearInterval(t);
  }, [load]);
  busy.current = !!modal || manage || dragId !== null || !!nameBox;

  async function move(id: number, status: string) {
    setData((d) => (d ? { ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, status } : t)) } : d));
    try {
      const r = await fetch(`/api/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!r.ok) setErr("Could not move the task");
    } catch { setErr("Network error"); }
    load();
  }

  if (gone) return <div className="card">Project not found. <Link href="/projects">Back to projects</Link></div>;
  if (!data) return <p className="mute">Loading...</p>;
  const { project, members, tasks: allProjectTasks } = data;
  const boards = data.boards?.length ? data.boards : [{ id: 0, name: "Main board", cols: [{ key: "todo", name: "To Do" }, { key: "doing", name: "In Progress" }, { key: "review", name: "Review" }, { key: "done", name: "Done" }] }];
  const board = boards.find((b) => b.id === activeBoard) ?? boards[0];
  const COLS: [string, string][] = board.cols.map((c) => [c.key, c.name]);
  const tasks = allProjectTasks.filter((t) => t.board_id === board.id || (!t.board_id && board.id === boards[0].id));
  async function boardApi(body: any) {
    setErr("");
    try {
      const r = await fetch(`/api/projects/${projectId}/boards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ board_id: board.id, ...body }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) { setErr(j.error || "Could not save"); return null; }
      await load();
      return j;
    } catch { setErr("Network error"); return null; }
  }
  const mem = (id: number | null) => members.find((m) => m.id === id);
  const allLabels = Array.from(new Set(tasks.flatMap((t) => t.labels || []))).sort();
  const shown = tasks.filter((t) =>
    (fA === "all" || (fA === "me" ? t.assignee_id === meId : fA === "none" ? !t.assignee_id : String(t.assignee_id) === fA)) &&
    (fP === "all" || t.priority === fP) && (fL === "all" || (t.labels || []).includes(fL)) &&
    (!search.trim() || t.title.toLowerCase().includes(search.trim().toLowerCase())));
  const dueCls = (t: Task) => (t.due_date && t.status !== "done" && t.due_date < today ? "due-bad" : "");
  const open = (t: Task) => setModal({ id: t.id, status: t.status });

  const card = (t: Task) => (
    <div key={t.id} className="pj-task" draggable onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setOver(null); }} onClick={() => open(t)}>
      <div className="t">{t.running && <span className="rec" title="Your timer is running" />} {t.title}</div>
      {t.labels?.length > 0 && <div style={{ marginBottom: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>{t.labels.map((l) => <span key={l} className="pj-chip">{l}</span>)}</div>}
      <div className="f">
        <span className={`pr pr-${t.priority}`}>{t.priority}</span>
        {t.blocked && <span className="badge b-bad" title="Waiting on another task">Blocked</span>}
        {t.due_date && <span className={dueCls(t)}>Due {fmtDate(t.due_date)}</span>}
        {t.recur && <span>Repeats {t.recur}</span>}
        {t.ck_total > 0 && <span>{t.ck_done}/{t.ck_total} checks</span>}
        {t.comments > 0 && <span>{t.comments} comments</span>}
        {t.files > 0 && <span>{t.files} files</span>}
        {t.spent > 0 && <span>{fmtDur(t.spent)}</span>}
        <span className="spacer" />
        {t.assignee_id && <span title={mem(t.assignee_id)?.name} className="row" style={{ gap: 4 }}><Av m={mem(t.assignee_id)} /></span>}
      </div>
    </div>
  );

  const first = new Date(cal.y, cal.m, 1);
  const startDow = first.getDay();
  const dim = new Date(cal.y, cal.m + 1, 0).getDate();
  const cells: { d: number; iso: string; off: boolean }[] = [];
  for (let i = 0; i < Math.ceil((startDow + dim) / 7) * 7; i++) {
    const dt = new Date(cal.y, cal.m, 1 - startDow + i);
    cells.push({ d: dt.getDate(), iso: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`, off: dt.getMonth() !== cal.m });
  }
  const moveCal = (n: number) => setCal((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div className={`pj-wrap ${bg ? "has-bg" : ""}`} style={bgCss(bg)}>
      <div className="row pj-head" style={{ marginBottom: 6 }}>
        <Link href="/projects" className="btn sec sm">Back</Link>
        <h1 style={{ margin: 0 }}>{project.name}</h1>
        {project.archived && <span className="badge b-mute">Archived</span>}
        <div className="spacer" />
        <button className="btn sec" onClick={() => setCustom(true)}>Customize</button>
        {isAdmin && <button className="btn sec" onClick={() => setManage(true)}>Manage project</button>}
        {!project.archived && <button className="btn" onClick={() => setModal({ id: null, status: "todo" })}>+ New task</button>}
      </div>
      {project.description && <p className="mute" style={{ marginTop: 0 }}>{project.description}</p>}

      <div className="row pj-boards">
        {boards.map((b) => <button key={b.id} className={`pj-tab ${b.id === board.id ? "on" : ""}`} onClick={() => setActiveBoard(b.id)}>{b.name}</button>)}
        {!project.archived && <button className="pj-tab add" onClick={() => setNameBox({ title: "New board", initial: "", onSave: async (n) => { const j = await boardApi({ action: "add_board", name: n, board_id: undefined }); if (j?.id) setActiveBoard(j.id); } })}>+ Add board</button>}
        <div className="spacer" />
        {!project.archived && <button className="btn sec sm" onClick={() => setNameBox({ title: "Rename board", initial: board.name, onSave: (n) => { boardApi({ action: "rename_board", name: n }); } })}>Rename board</button>}
        {isAdmin && boards.length > 1 && <button className="btn bad sm" onClick={() => { if (confirm(`Delete board "${board.name}" and all its tasks? This cannot be undone.`)) { boardApi({ action: "delete_board" }).then((j) => { if (j) setActiveBoard(null); }); } }}>Delete board</button>}
      </div>

      <div className="row" style={{ margin: "12px 0" }}>
        <input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 180 }} />
        <select value={fA} onChange={(e) => setFA(e.target.value)} style={{ width: 160 }}>
          <option value="all">All assignees</option><option value="me">Assigned to me</option><option value="none">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={fP} onChange={(e) => setFP(e.target.value)} style={{ width: 130 }}>
          <option value="all">All priorities</option>{PRIOS.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
        </select>
        {allLabels.length > 0 && (
          <select value={fL} onChange={(e) => setFL(e.target.value)} style={{ width: 130 }}>
            <option value="all">All labels</option>{allLabels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        <div className="spacer" />
        {(["board", "list", "calendar"] as const).map((v) => <button key={v} className={`btn sm ${view === v ? "" : "sec"}`} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
      </div>
      {err && <div className="err">{err}</div>}

      {view === "board" && (
        <div className="pj-board" style={{ gridTemplateColumns: `repeat(${COLS.length}, minmax(240px, 1fr)) 170px` }}>
          {COLS.map(([key, label], ci) => {
            const col = shown.filter((t) => t.status === key);
            return (
              <div key={key} className={`pj-col ${over === key ? "over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setOver(key); }} onDragLeave={() => setOver((o) => (o === key ? null : o))}
                onDrop={(e) => { e.preventDefault(); const id = dragId; setDragId(null); setOver(null); const t = tasks.find((x) => x.id === id); if (id && t && t.status !== key) move(id, key); }}>
                <h4>{label}<span className="n">{col.length}</span>
                  {!project.archived && (
                    <span className="pj-colbtns">
                      <button title="Move left" disabled={ci === 0} onClick={() => boardApi({ action: "move_col", key, dir: "left" })}>&lsaquo;</button>
                      <button title="Move right" disabled={ci === COLS.length - 1} onClick={() => boardApi({ action: "move_col", key, dir: "right" })}>&rsaquo;</button>
                      <button title="Rename column" onClick={() => setNameBox({ title: "Rename column", initial: label, onSave: (n) => { boardApi({ action: "rename_col", key, name: n }); } })}>Edit</button>
                      {key !== "todo" && key !== "done" && <button title="Delete column" onClick={() => { if (confirm(`Delete column "${label}"? Its tasks will move to ${COLS.find((c) => c[0] === "todo")?.[1] ?? "To Do"}.`)) boardApi({ action: "delete_col", key }); }}>x</button>}
                    </span>
                  )}
                </h4>
                {col.map(card)}
                {!project.archived && <button className="pj-add" onClick={() => setModal({ id: null, status: key })}>+ Add task</button>}
              </div>
            );
          })}
          {!project.archived && <button className="pj-addcol" onClick={() => setNameBox({ title: "New column", initial: "", onSave: (n) => { boardApi({ action: "add_col", name: n }); } })}>+ Add column</button>}
        </div>
      )}

      {view === "list" && (
        <div className="card scroll">
          <table>
            <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th><th>Time</th></tr></thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => open(t)}>
                  <td><b>{t.title}</b>{t.blocked && <span className="badge b-bad" style={{ marginLeft: 6 }}>Blocked</span>}{(t.labels || []).map((l) => <span key={l} className="pj-chip" style={{ marginLeft: 6 }}>{l}</span>)}</td>
                  <td>{COLS.find((c) => c[0] === t.status)?.[1]}</td>
                  <td><span className={`pr pr-${t.priority}`}>{t.priority}</span></td>
                  <td>{mem(t.assignee_id)?.name ?? <span className="mute">Unassigned</span>}</td>
                  <td className={dueCls(t)}>{t.due_date ? fmtDate(t.due_date) : ""}</td>
                  <td>{t.spent > 0 ? fmtDur(t.spent) : ""}</td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={6} className="mute">No tasks found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {view === "calendar" && (
        <>
          <div className="row" style={{ marginBottom: 10 }}>
            <button className="btn sec sm" onClick={() => moveCal(-1)}>Prev</button>
            <b style={{ minWidth: 140, textAlign: "center" }}>{first.toLocaleString("en-US", { month: "long", year: "numeric" })}</b>
            <button className="btn sec sm" onClick={() => moveCal(1)}>Next</button>
            <span className="mute" style={{ marginLeft: 10 }}>Tasks appear on their due date</span>
          </div>
          <div className="pj-cal">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="wd">{d}</div>)}
            {cells.map((c) => (
              <div key={c.iso} className={`day ${c.off ? "off" : ""} ${c.iso === today ? "today" : ""}`}>
                <div className="dn">{c.d}</div>
                {shown.filter((t) => t.due_date === c.iso).map((t) => (
                  <button key={t.id} className="ev" style={{ background: t.status === "done" ? "#dcfce7" : PCOL[t.priority] }} title={t.title} onClick={() => open(t)}>{t.title}</button>
                ))}
              </div>
            ))}
          </div>
          {shown.some((t) => !t.due_date) && <p className="mute">{shown.filter((t) => !t.due_date).length} tasks have no due date and are not shown here.</p>}
        </>
      )}

      {modal && <TaskModal projectId={projectId} boardId={board.id || null} cols={COLS} taskId={modal.id} defStatus={modal.status} members={members} allTasks={tasks} meId={meId} isAdmin={isAdmin} tz={tz} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {nameBox && <NameModal title={nameBox.title} initial={nameBox.initial} onSave={(n) => { const f = nameBox.onSave; setNameBox(null); f(n); }} onClose={() => setNameBox(null)} />}
      {custom && <CustomizeModal projectId={projectId} bg={bg} onChange={setBg} onClose={() => setCustom(false)} />}
      {manage && <ManageModal data={data} onClose={() => setManage(false)} onSaved={() => { setManage(false); load(); }} onDeleted={() => { window.location.href = "/projects"; }} />}
    </div>
  );
}

function TaskModal({ projectId, boardId, cols: COLS, taskId, defStatus, members, allTasks, meId, isAdmin, tz, onClose, onSaved }: { projectId: number; boardId: number | null; cols: [string, string][]; taskId: number | null; defStatus: string; members: Member[]; allTasks: Task[]; meId: number; isAdmin: boolean; tz: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: "", description: "", status: defStatus, priority: "medium", assignee_id: "", due_date: "", labels: "", recur: "" });
  const [deps, setDeps] = useState<number[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [comment, setComment] = useState("");
  const [tagged, setTagged] = useState<{ id: number; name: string }[]>([]);
  const [item, setItem] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const fetchedAt = useRef(Date.now());
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDetail = useCallback(async () => {
    if (!taskId) return;
    try {
      const r = await fetch(`/api/tasks/${taskId}`);
      if (!r.ok) return;
      const j: Detail = await r.json();
      fetchedAt.current = Date.now();
      setDetail(j);
      return j;
    } catch {}
  }, [taskId]);
  useEffect(() => {
    loadDetail().then((j) => {
      if (j) setF({ title: j.task.title, description: j.task.description ?? "", status: j.task.status, priority: j.task.priority, assignee_id: j.task.assignee_id ? String(j.task.assignee_id) : "", due_date: j.task.due_date ?? "", labels: (j.task.labels || []).join(", "), recur: j.task.recur ?? "" });
      if (j) setDeps(j.task.blocked_by || []);
    });
  }, [loadDetail]);
  useEffect(() => { if (!detail?.time.running) return; const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, [detail?.time.running]);

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function call(url: string, method: string, body: any) {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j: any = {}; try { j = await r.json(); } catch {}
    if (!r.ok) throw new Error(j.error || "Something went wrong");
    return j;
  }
  const act = async (body: any) => { try { await call(`/api/tasks/${taskId}`, "POST", body); await loadDetail(); } catch (e: any) { setErr(e.message); } };

  async function save() {
    setBusy(true); setErr("");
    try {
      const body = { ...f, labels: f.labels.split(",").map((x) => x.trim()).filter(Boolean), assignee_id: f.assignee_id ? Number(f.assignee_id) : null, due_date: f.due_date || null, recur: f.recur || null, blocked_by: deps };
      if (taskId) await call(`/api/tasks/${taskId}`, "PUT", body); else await call(`/api/projects/${projectId}/tasks`, "POST", { ...body, board_id: boardId });
      onSaved();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  async function remove() {
    if (!taskId || !confirm("Delete this task?")) return;
    try { await call(`/api/tasks/${taskId}`, "DELETE", {}); onSaved(); } catch (e: any) { setErr(e.message); }
  }
  async function addComment() {
    if (!taskId || !comment.trim()) return;
    const mentions = tagged.filter((t) => comment.includes("@" + t.name)).map((t) => t.id);
    await act({ comment, mentions }); setComment(""); setTagged([]);
  }
  async function upload(file: File) {
    if (!taskId) return;
    if (file.size > MAX) return setErr("File is too large (max 50 MB)");
    setErr(""); setProgress(0);
    try {
      const j = await call("/api/chat/files", "POST", { name: file.name, size: file.size, type: file.type || "application/octet-stream" });
      const CH = 3 * 1024 * 1024;
      for (let i = 0, off = 0; off < file.size; i++, off += CH) {
        const pr = await fetch(`/api/chat/files/${j.id}?idx=${i}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file.slice(off, off + CH) });
        if (!pr.ok) throw new Error("Upload failed, please try again");
        setProgress(Math.min(100, Math.round(((off + CH) / file.size) * 100)));
      }
      await act({ file: { id: j.id } });
    } catch (e: any) { setErr(e.message || "Upload failed"); }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }
  async function removeFile(id: number) {
    try { await call(`/api/tasks/${taskId}`, "PUT", { removeFile: id }); await loadDetail(); } catch (e: any) { setErr(e.message); }
  }

  const canDelete = !!taskId && (isAdmin || detail?.task.created_by === meId);
  const when = (d: string) => new Date(d).toLocaleString("en-US", { timeZone: tz, month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const elapsed = detail?.time.running ? Math.floor((Date.now() - fetchedAt.current) / 1000) : 0;
  void tick;
  const total = (detail?.time.total ?? 0) + elapsed;
  const mq = (() => { const i = comment.lastIndexOf("@"); if (i < 0 || (i > 0 && !/\s/.test(comment[i - 1]))) return null; const q = comment.slice(i + 1); if (q.length > 20 || q.includes("\n") || q.endsWith(" ")) return null; return { i, q }; })();
  const cands = mq ? members.filter((m) => m.id !== meId && m.name.toLowerCase().includes(mq.q.toLowerCase())).slice(0, 6) : [];
  const pick = (m: Member) => { if (!mq) return; setComment(comment.slice(0, mq.i) + "@" + m.name + " "); setTagged((t) => (t.some((x) => x.id === m.id) ? t : [...t, { id: m.id, name: m.name }])); };
  const names = members.map((m) => m.name).sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const render = (b: string) => names.length ? b.split(new RegExp("(@(?:" + names.join("|") + "))", "g")).map((p, i) => (i % 2 ? <span key={i} className="mention">{p}</span> : p)) : b;
  const ck = detail?.checklist ?? [];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 10 }}>
          <b style={{ fontSize: 16 }}>{taskId ? "Task" : "New task"}</b><div className="spacer" /><button className="btn sec sm" onClick={onClose}>Close</button>
        </div>
        <label>Title</label>
        <input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={200} autoFocus={!taskId} />
        <label style={{ marginTop: 10 }}>Description</label>
        <textarea rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
        <div className="pj-two" style={{ marginTop: 10 }}>
          <div><label>Status</label><select value={f.status} onChange={(e) => set("status", e.target.value)}>{COLS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label>Priority</label><select value={f.priority} onChange={(e) => set("priority", e.target.value)}>{PRIOS.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</select></div>
          <div><label>Assignee</label><select value={f.assignee_id} onChange={(e) => set("assignee_id", e.target.value)}><option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label>Due date</label><input type="date" value={f.due_date} onChange={(e) => set("due_date", e.target.value)} /></div>
        </div>
        <label style={{ marginTop: 10 }}>Labels (comma separated)</label>
        <input value={f.labels} onChange={(e) => set("labels", e.target.value)} placeholder="design, bug, client" />
        <label style={{ marginTop: 10 }}>Repeats</label>
        <select value={f.recur} onChange={(e) => set("recur", e.target.value)}>
          <option value="">Does not repeat</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option>
        </select>
        {f.recur && <div className="mute" style={{ fontSize: 12, marginTop: 4 }}>When this task is marked Done, a fresh copy is created automatically with the next due date.</div>}
        {allTasks.filter((x) => x.id !== taskId).length > 0 && (
          <>
            <label style={{ marginTop: 10 }}>Blocked by (cannot start until these are Done)</label>
            <div className="pj-members">
              {allTasks.filter((x) => x.id !== taskId).map((x) => (
                <label key={x.id}><input type="checkbox" checked={deps.includes(x.id)} onChange={() => setDeps((d) => (d.includes(x.id) ? d.filter((n) => n !== x.id) : [...d, x.id]))} />{x.title}{x.status === "done" ? " (done)" : ""}</label>
              ))}
            </div>
          </>
        )}
        {err && <div className="err">{err}</div>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" disabled={!f.title.trim() || busy} onClick={save}>{taskId ? "Save changes" : "Create task"}</button>
          {canDelete && <button className="btn bad" onClick={remove}>Delete</button>}
        </div>

        {taskId && detail && (
          <>
            <h4 style={{ margin: "20px 0 4px" }}>Time tracking</h4>
            <div className="pj-timer">
              <span className="t">{clock(total)}</span>
              {detail.time.running
                ? <button className="btn bad sm" onClick={() => act({ timer: "stop" })}>Stop timer</button>
                : <button className="btn ok sm" onClick={() => act({ timer: "start" })}>Start timer</button>}
              <span className="mute" style={{ fontSize: 12 }}>Starting a timer stops any other timer of yours.</span>
            </div>
            {detail.time.byUser.length > 0 && <div className="mute" style={{ fontSize: 12, marginTop: 4 }}>{detail.time.byUser.map((u) => `${u.name}: ${fmtDur(u.seconds)}`).join("  |  ")}</div>}

            <h4 style={{ margin: "20px 0 4px" }}>Checklist {ck.length > 0 && <span className="mute" style={{ fontWeight: 400 }}>({ck.filter((c) => c.done).length}/{ck.length})</span>}</h4>
            {ck.map((c) => (
              <div key={c.id} className={`pj-ck ${c.done ? "done" : ""}`}>
                <input type="checkbox" checked={c.done} onChange={() => act({ check: { toggle: c.id } })} />
                <span style={{ flex: 1 }}>{c.text}</span>
                <button className="btn sec sm" onClick={() => act({ check: { remove: c.id } })}>Remove</button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 6, flexWrap: "nowrap" }}>
              <input placeholder="Add a checklist item..." value={item} maxLength={200} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (item.trim()) { act({ check: { add: item } }); setItem(""); } } }} />
              <button className="btn sec" disabled={!item.trim()} onClick={() => { act({ check: { add: item } }); setItem(""); }}>Add</button>
            </div>

            <h4 style={{ margin: "20px 0 4px" }}>Attachments</h4>
            {detail.files.map((x) => (
              <div key={x.id} className="pj-file">
                <span>📎</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{x.name}</div><div className="mute" style={{ fontSize: 11 }}>{fmtSize(x.size)}</div></div>
                <a className="btn sec sm" href={`/api/chat/files/${x.id}?download=1`}>Download</a>
                {(isAdmin || x.user_id === meId) && <button className="btn bad sm" onClick={() => removeFile(x.id)}>Remove</button>}
              </div>
            ))}
            <div className="row" style={{ marginTop: 8 }}>
              <input ref={fileRef} type="file" hidden onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x); }} />
              <button className="btn sec sm" disabled={progress !== null} onClick={() => fileRef.current?.click()}>Attach a file</button>
              {progress !== null && <span className="mute">Uploading... {progress}%</span>}
            </div>

            <h4 style={{ margin: "20px 0 4px" }}>Comments</h4>
            {detail.comments.map((c) => (
              <div key={c.id} className="pj-cm"><div className="h"><b>{c.name ?? "Deleted user"}</b> · {when(c.created_at)}</div><div style={{ whiteSpace: "pre-wrap" }}>{render(c.body)}</div></div>
            ))}
            {!detail.comments.length && <p className="mute" style={{ margin: "4px 0" }}>No comments yet.</p>}
            <div className="row" style={{ marginTop: 8, flexWrap: "nowrap" }}>
              <div style={{ flex: 1, position: "relative" }}>
                {cands.length > 0 && <div className="pj-mention-list">{cands.map((c) => <div key={c.id} onMouseDown={(e) => { e.preventDefault(); pick(c); }}>@{c.name}</div>)}</div>}
                <input placeholder="Write a comment... (@ to tag someone)" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addComment(); } }} />
              </div>
              <button className="btn" disabled={!comment.trim()} onClick={addComment}>Send</button>
            </div>

            <h4 style={{ margin: "20px 0 4px" }}>Activity</h4>
            {detail.activity.map((a) => (
              <div key={a.id} className="mute" style={{ fontSize: 12, padding: "3px 0" }}><b>{a.name ?? "Someone"}</b> {a.text} · {when(a.created_at)}</div>
            ))}
            {!detail.activity.length && <p className="mute" style={{ margin: "4px 0", fontSize: 12 }}>No activity yet.</p>}
          </>
        )}
      </div>
    </div>
  );
}

function ManageModal({ data, onClose, onSaved, onDeleted }: { data: Data; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const { project } = data;
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description ?? "");
  const [sel, setSel] = useState<number[]>(data.memberIds);
  const [err, setErr] = useState("");

  async function put(body: any) {
    const r = await fetch(`/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j: any = {}; try { j = await r.json(); } catch {}
    if (!r.ok) return setErr(j.error || "Could not save");
    onSaved();
  }
  async function del() {
    if (!confirm("Delete this project and all its tasks? This cannot be undone.")) return;
    const r = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (r.ok) onDeleted(); else setErr("Could not delete");
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Manage project</h3>
        <label>Project name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <label style={{ marginTop: 10 }}>Description</label>
        <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000} />
        <label style={{ marginTop: 10 }}>Members</label>
        <div className="pj-members">
          {data.users.filter((u) => u.role !== "admin").map((u) => (
            <label key={u.id}><input type="checkbox" checked={sel.includes(u.id)} onChange={() => setSel((s) => (s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id]))} />{u.name}</label>
          ))}
        </div>
        {err && <div className="err">{err}</div>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" disabled={!name.trim()} onClick={() => put({ name, description: desc, members: sel })}>Save</button>
          <button className="btn sec" onClick={() => put({ archived: !project.archived })}>{project.archived ? "Unarchive" : "Archive"}</button>
          <div className="spacer" />
          <button className="btn bad" onClick={del}>Delete project</button>
        </div>
      </div>
    </div>
  );
}

// Each person can pick their own background for this board (saved per user).
function CustomizeModal({ projectId, bg, onChange, onClose }: { projectId: number; bg: string | null; onChange: (v: string | null) => void; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [pick, setPick] = useState("#6366f1");
  async function save(v: string | null) {
    setErr("");
    try {
      const r = await fetch(`/api/projects/${projectId}/bg`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bg: v }) });
      if (!r.ok) { let j: any = {}; try { j = await r.json(); } catch {} return setErr(j.error || "Could not save"); }
      onChange(v);
    } catch { setErr("Network error, please try again"); }
  }
  const sw = (css: React.CSSProperties, v: string, k: string) => (
    <button key={k} type="button" title="Use this" onClick={() => save(v)} style={{ ...css, width: 44, height: 32, borderRadius: 6, border: bg === v ? "3px solid #6366f1" : "1px solid #cbd5e1", cursor: "pointer" }} />
  );
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Customize board</h3>
        <p className="mute" style={{ marginTop: 0 }}>Only you see this background.</p>
        <label>Colors</label>
        <div className="row" style={{ flexWrap: "wrap", marginBottom: 10 }}>
          {SOLIDS.map((c) => sw({ background: c }, `c:${c}`, c))}
          <input type="color" value={pick} onChange={(e) => setPick(e.target.value)} style={{ width: 44, height: 32, padding: 0 }} />
          <button type="button" className="btn sec sm" onClick={() => save(`c:${pick}`)}>Use picked color</button>
        </div>
        <label>Gradients</label>
        <div className="row" style={{ flexWrap: "wrap", marginBottom: 10 }}>
          {GRADS.map(([a, b]) => sw({ background: `linear-gradient(135deg, ${a}, ${b})` }, `g:${a},${b}`, a + b))}
        </div>
        <label>Your own picture</label>
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
        {file && <ImageCropper file={file} aspect={16 / 9} outW={1280} maxLen={650_000} onDone={(d) => { setFile(null); save(`i:${d}`); }} onCancel={() => setFile(null)} />}
        {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
        <div className="row" style={{ marginTop: 14, justifyContent: "space-between" }}>
          <button type="button" className="btn sec" disabled={!bg} onClick={() => save(null)}>Reset to default</button>
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// Small popup used to type a board or column name.
function NameModal({ title, initial, onSave, onClose }: { title: string; initial: string; onSave: (n: string) => void; onClose: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <input autoFocus value={v} maxLength={60} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) onSave(v.trim()); }} placeholder="Name" />
        <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
          <button className="btn sec" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={!v.trim()} onClick={() => onSave(v.trim())}>Save</button>
        </div>
      </div>
    </div>
  );
}
