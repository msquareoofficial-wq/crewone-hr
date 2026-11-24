"use client";
// Powered By Vistech Force
// Click your own avatar in the top bar to change your picture and set a status.
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageCropper from "./ImageCropper";

const PRESETS = ["Available", "In a meeting", "On a break", "Busy", "Working from home", "Do not disturb"];

const FONTS = [
  { key: "inter",  label: "Inter",  css: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { key: "system", label: "System", css: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { key: "serif",  label: "Serif",  css: "Georgia, 'Times New Roman', serif" },
  { key: "mono",   label: "Mono",   css: "'Courier New', Consolas, monospace" },
];

const SIZES = [
  { key: "13", label: "S" },
  { key: "14", label: "M" },
  { key: "15", label: "L" },
  { key: "16", label: "XL" },
];

const ACCENTS = [
  { key: "indigo",  label: "Indigo",  color: "#4f46e5", brand: "#4f46e5", brand2: "#4338ca", dark: "#6366f1", dark2: "#4f46e5" },
  { key: "blue",    label: "Blue",    color: "#2563eb", brand: "#2563eb", brand2: "#1d4ed8", dark: "#3b82f6", dark2: "#2563eb" },
  { key: "violet",  label: "Violet",  color: "#7c3aed", brand: "#7c3aed", brand2: "#6d28d9", dark: "#8b5cf6", dark2: "#7c3aed" },
  { key: "teal",    label: "Teal",    color: "#0d9488", brand: "#0d9488", brand2: "#0f766e", dark: "#14b8a6", dark2: "#0d9488" },
  { key: "rose",    label: "Rose",    color: "#e11d48", brand: "#e11d48", brand2: "#be123c", dark: "#fb7185", dark2: "#e11d48" },
];

function applyPrefs(font?: string | null, size?: string | null, accent?: string | null) {
  let el = document.getElementById("u-pref") as HTMLStyleElement | null;
  if (!el) { el = document.createElement("style"); el.id = "u-pref"; document.head.appendChild(el); }
  const f = font  ?? (typeof localStorage !== "undefined" ? localStorage.getItem("app-font")   : null);
  const s = size  ?? (typeof localStorage !== "undefined" ? localStorage.getItem("app-size")   : null);
  const a = accent ?? (typeof localStorage !== "undefined" ? localStorage.getItem("app-accent") : null);
  const fObj = FONTS.find(x => x.key === f);
  const aObj = ACCENTS.find(x => x.key === a);
  let css = "";
  const fb = fObj ? `font-family:${fObj.css};` : "";
  const sb = s ? `font-size:${s}px;` : "";
  if (fb || sb) css += `body{${fb}${sb}}`;
  if (aObj) css += `:root{--brand:${aObj.brand};--brand2:${aObj.brand2}}[data-theme="dark"]{--brand:${aObj.dark};--brand2:${aObj.dark2}}`;
  el.textContent = css;
}

export default function MyProfile({ name, picture, status }: { name: string; picture: string | null; status: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pic, setPic] = useState<string | null>(picture);
  const [st, setSt] = useState(status ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [font, setFont]   = useState<string>("inter");
  const [size, setSize]   = useState<string>("14");
  const [accent, setAccent] = useState<string>("indigo");
  const sz = { width: 34, height: 34 };

  useEffect(() => {
    try {
      setFont(localStorage.getItem("app-font") ?? "inter");
      setSize(localStorage.getItem("app-size") ?? "14");
      setAccent(localStorage.getItem("app-accent") ?? "indigo");
    } catch {}
  }, []);

  function pickFont(key: string) {
    setFont(key);
    try { localStorage.setItem("app-font", key); } catch {}
    applyPrefs(key, null, null);
  }
  function pickSize(key: string) {
    setSize(key);
    try { localStorage.setItem("app-size", key); } catch {}
    applyPrefs(null, key, null);
  }
  function pickAccent(key: string) {
    setAccent(key);
    try { localStorage.setItem("app-accent", key); } catch {}
    applyPrefs(null, null, key);
  }

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

            {/* ── Appearance ── */}
            <hr style={{ margin: "16px 0 12px", border: 0, borderTop: "1px solid var(--line)" }} />
            <div style={{ marginBottom: 10 }}>
              <label style={{ marginBottom: 6 }}>Font style</label>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {FONTS.map(f => (
                  <button key={f.key} type="button" className={`pj-tab${font === f.key ? " on" : ""}`} style={{ fontFamily: f.css }} onClick={() => pickFont(f.key)}>{f.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ marginBottom: 6 }}>Font size</label>
              <div className="row" style={{ gap: 6 }}>
                {SIZES.map(s => (
                  <button key={s.key} type="button" className={`pj-tab${size === s.key ? " on" : ""}`} onClick={() => pickSize(s.key)}>{s.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 4 }}>
              <label style={{ marginBottom: 8 }}>Accent color</label>
              <div className="row" style={{ gap: 8 }}>
                {ACCENTS.map(a => (
                  <button key={a.key} type="button" title={a.label} onClick={() => pickAccent(a.key)}
                    style={{ width: 28, height: 28, borderRadius: "50%", border: accent === a.key ? "3px solid var(--ink)" : "3px solid transparent", background: a.color, cursor: "pointer", outline: accent === a.key ? "2px solid var(--ink)" : "none", outlineOffset: 2, padding: 0 }} />
                ))}
              </div>
            </div>

            {err && <div className="err">{err}</div>}
            <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button type="button" className="btn sec" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="btn" disabled={busy} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
