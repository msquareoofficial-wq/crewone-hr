// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageCropper from "./ImageCropper";

const PERM_LIST = [
  { key: "dashboard", label: "Team dashboard (who is present / absent)" },
  { key: "leaves", label: "Approve or reject leave requests" },
  { key: "reports", label: "Attendance reports and CSV" },
  { key: "notifications", label: "Post notifications and holidays" },
];

type U = Record<string, any>;

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function UserForm({ initial, id, initialLocked }: { initial?: U; id?: number; initialLocked?: boolean }) {
  const router = useRouter();
  const [locked, setLocked] = useState(initialLocked ?? false);
  const [pic, setPic] = useState<string | null>(initial?.picture ?? null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<{ emp_id: string; password: string } | null>(null);
  const [okMsg, setOkMsg] = useState("");
  const v = (k: string, d = "") => initial?.[k] ?? d;
  const [shiftType, setShiftType] = useState<string>(initial?.shift_type ?? "fixed");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(""); setOkMsg(""); setCreated(null);
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form).entries());
    const body = { ...f, picture: pic, perms: new FormData(form).getAll("perms") };
    const r = await fetch(id ? `/api/users/${id}` : "/api/users", { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return setErr(j.error || "Error");
    if (id) { setOkMsg("Updated successfully"); setLocked(true); }
    else { setCreated({ emp_id: j.emp_id, password: j.password }); form.reset(); setPic(null); }
    router.refresh();
  }

  const inp = (name: string, label: string, type = "text", required = false) => (
    <div>
      <label>{label}</label>
      <input name={name} type={type} defaultValue={v(name)} required={required} disabled={locked} style={locked ? { opacity: 0.65, cursor: "not-allowed", background: "var(--bg)" } : {}} />
    </div>
  );

  return (
    <div>
      {/* Lock/unlock header — only for edit mode */}
      {id && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span className="mute" style={{ fontSize: "0.85rem" }}>
            {locked ? "Fields are locked — click the pencil to edit." : "Fields are unlocked — make changes and save."}
          </span>
          <button
            type="button"
            onClick={() => { setLocked(l => !l); setErr(""); setOkMsg(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "6px 14px", borderRadius: 8, border: "1px solid var(--line)",
              background: locked ? "var(--brand-soft, #eef0ff)" : "var(--card)",
              color: locked ? "var(--brand, #4f46e5)" : "var(--ink)",
              cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
            }}
            title={locked ? "Click to enable editing" : "Click to lock fields"}
          >
            <PencilIcon />
            {locked ? "Edit" : "Lock"}
          </button>
        </div>
      )}

      <form onSubmit={submit}>
        <div className="form">
          {inp("name", "1. Name", "text", true)}
          {inp("pseudo_name", "2. Pseudo name")}
          {inp("phone", "3. Number")}
          {inp("office_phone", "4. Office number")}
          {inp("email", "5. Email", "email", true)}
          {inp("office_email", "6. Office email", "email")}
          {inp("pseudo_email", "7. Pseudo email", "email")}
          {inp("cnic", "8. CNIC")}
          {inp("emergency_contact_name", "Emergency contact name")}
          {inp("emergency_contact_phone", "Emergency contact number", "tel")}
          {inp("joining_date", "9. Date of joining", "date")}
          <div>
            <label>10. Department</label>
            <select name="department" defaultValue={v("department")} disabled={locked} style={locked ? { opacity: 0.65, cursor: "not-allowed", background: "var(--bg)" } : {}}>
              <option value="">Select</option><option>Sales</option><option>Production</option>
            </select>
          </div>
          {inp("designation", "Designation (e.g. CMS Developer)")}
          <div>
            <label>11. Shift timings</label>
            <select name="shift_type" value={shiftType} onChange={(e) => setShiftType(e.target.value)} disabled={locked} style={{ marginBottom: 8, ...(locked ? { opacity: 0.65, cursor: "not-allowed", background: "var(--bg)" } : {}) }}>
              <option value="fixed">Fixed shift (comes on all working days)</option>
              <option value="hybrid">Hybrid (comes only some days a week)</option>
            </select>
            {shiftType === "hybrid" && <div className="mute" style={{ fontSize: 12, marginBottom: 6 }}>Hybrid: never marked late or absent, no "Not in yet" alert. Salary is not cut for days not in. Times below are only for reference.</div>}
            <div className="row">
              <input name="shift_start" type="time" defaultValue={v("shift_start", "09:00")} style={{ flex: 1, ...(locked ? { opacity: 0.65, cursor: "not-allowed", background: "var(--bg)" } : {}) }} disabled={locked} />
              <span>to</span>
              <input name="shift_end" type="time" defaultValue={v("shift_end", "17:00")} style={{ flex: 1, ...(locked ? { opacity: 0.65, cursor: "not-allowed", background: "var(--bg)" } : {}) }} disabled={locked} />
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>12. Grace period (minutes) — leave blank to use the global setting</label>
            <input name="grace_minutes" type="number" defaultValue={v("grace_minutes")} min={0} max={120} placeholder="e.g. 15" style={{ maxWidth: 200, ...(locked ? { opacity: 0.65, cursor: "not-allowed", background: "var(--bg)" } : {}) }} disabled={locked} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>12b. Leave quota (days/year) — leave blank to use the global setting</label>
            <input name="leave_quota" type="number" defaultValue={v("leave_quota")} min={0} max={365} placeholder="e.g. 15" style={{ maxWidth: 200, ...(locked ? { opacity: 0.65, cursor: "not-allowed", background: "var(--bg)" } : {}) }} disabled={locked} />
          </div>
          <div>
            <label>13. Picture</label>
            {!locked && <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} />}
            {cropFile && <ImageCropper file={cropFile} outW={256} round onDone={(d) => { setPic(d); setCropFile(null); }} onCancel={() => setCropFile(null)} />}
            {pic && /* eslint-disable-next-line @next/next/no-img-element */ <img src={pic} alt="" className="avatar" style={{ width: 56, height: 56, marginTop: 8 }} />}
            {locked && !pic && <span className="mute" style={{ fontSize: "0.85rem" }}>No picture set</span>}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label>14. Admin rights (optional, for heads like Head of Sales / Head of Production)</label>
          <div className="pj-members" style={{ maxHeight: "none", opacity: locked ? 0.6 : 1, pointerEvents: locked ? "none" : "auto" }}>
            {PERM_LIST.map((p) => (
              <label key={p.key}><input type="checkbox" name="perms" value={p.key} defaultChecked={(initial?.perms ?? []).includes(p.key)} disabled={locked} />{p.label}</label>
            ))}
          </div>
        </div>
        {err && <div className="err">{err}</div>}
        {okMsg && <div className="okmsg">{okMsg}</div>}
        {created && (
          <div className="okmsg">
            User created. <b>ID: {created.emp_id}</b> | <b>Password: {created.password}</b> (shown only once, please share it with the user)
          </div>
        )}
        {!locked && (
          <div style={{ marginTop: 14 }}><button className="btn">{id ? "Save changes" : "Create user"}</button></div>
        )}
      </form>
    </div>
  );
}
