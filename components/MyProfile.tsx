"use client";
// Powered By Vistech Force
// Click your own avatar in the top bar to change your picture and set a status.
import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageCropper from "./ImageCropper";

const PRESETS = ["Available", "In a meeting", "On a break", "Busy", "Working from home", "Do not disturb"];

export default function MyProfile({ name, picture, status }: { name: string; picture: string | null; status: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pic, setPic] = useState<string | null>(picture);
  const [st, setSt] = useState(status ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const sz = { width: 34, height: 34 };

  async function save() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ picture: pic ?? "", status_text: st }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      if (!r.ok) { setErr(j.error || "Could not save"); setBusy(false); return; }
      setOpen(false); setBusy(false); router.refresh();
    } catch { setErr("Network error"); setBusy(false); }
  }

  return (
    <>
      <button type="button" className="me-btn" title="Change my picture and status" onClick={() => { setPic(picture); setSt(status ?? ""); setErr(""); setOpen(true); }}>
        <span className="av-wrap" style={sz}>
          {picture ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="avatar" style={sz} src={picture} alt={name} /> : <span className="avatar" style={sz}>{name.slice(0, 1).toUpperCase()}</span>}
          <i className="dot on" />
        </span>
      </button>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ color: "var(--ink)" }}>
            <h3 style={{ marginTop: 0 }}>My picture and status</h3>
            <div className="row" style={{ marginBottom: 12 }}>
              {pic ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="avatar" style={{ width: 72, height: 72 }} src={pic} alt="" /> : <span className="avatar" style={{ width: 72, height: 72, fontSize: 28 }}>{name.slice(0, 1).toUpperCase()}</span>}
              <div>
                <input type="file" accept="image/*" id="dp-file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
                <button type="button" className="btn sec sm" onClick={() => document.getElementById("dp-file")?.click()}>Change picture</button>{" "}
                {pic && <button type="button" className="btn sec sm" onClick={() => setPic(null)}>Remove</button>}
              </div>
            </div>
            {file && <ImageCropper file={file} outW={256} round onDone={(d) => { setPic(d); setFile(null); }} onCancel={() => setFile(null)} />}
            <label>Status</label>
            <input value={st} maxLength={80} placeholder="What are you up to?" onChange={(e) => setSt(e.target.value)} />
            <div className="row" style={{ marginTop: 8, gap: 6 }}>
              {PRESETS.map((p) => <button key={p} type="button" className={`pj-tab ${st === p ? "on" : ""}`} onClick={() => setSt(p)}>{p}</button>)}
              {st && <button type="button" className="pj-tab add" onClick={() => setSt("")}>Clear</button>}
            </div>
            {err && <div className="err">{err}</div>}
            <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
              <button type="button" className="btn sec" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="btn" disabled={busy} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
