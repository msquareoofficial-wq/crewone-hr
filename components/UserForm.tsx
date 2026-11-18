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

export default function UserForm({ initial, id }: { initial?: U; id?: number }) {
  const router = useRouter();
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
    if (id) setOkMsg("Updated");
    else { setCreated({ emp_id: j.emp_id, password: j.password }); form.reset(); setPic(null); }
    router.refresh();
  }

  const input = (name: string, label: string, type = "text", required = false) => (
    <div><label>{label}</label><input name={name} type={type} defaultValue={v(name)} required={required} /></div>
  );

  return (
    <form onSubmit={submit}>
      <div className="form">
        {input("name", "1. Name", "text", true)}
        {input("pseudo_name", "2. Pseudo name")}
        {input("phone", "3. Number")}
        {input("office_phone", "4. Office number")}
        {input("email", "5. Email", "email", true)}
        {input("office_email", "6. Office email", "email")}
        {input("pseudo_email", "7. Pseudo email", "email")}
        {input("cnic", "8. CNIC")}
        {input("joining_date", "9. Date of joining", "date")}
        <div>
          <label>10. Department</label>
          <select name="department" defaultValue={v("department")}>
            <option value="">Select</option><option>Sales</option><option>Production</option>
          </select>
        </div>
        {input("designation", "Designation (e.g. CMS Developer)")}
        <div>
          <label>11. Shift timings</label>
          <select name="shift_type" value={shiftType} onChange={(e) => setShiftType(e.target.value)} style={{ marginBottom: 8 }}>
            <option value="fixed">Fixed shift (comes on all working days)</option>
            <option value="hybrid">Hybrid (comes only some days a week)</option>
          </select>
          {shiftType === "hybrid" && <div className="mute" style={{ fontSize: 12, marginBottom: 6 }}>Hybrid: never marked late or absent, no "Not in yet" alert. Salary is not cut for days not in. Times below are only for reference.</div>}
          <div className="row">
            <input name="shift_start" type="time" defaultValue={v("shift_start", "09:00")} style={{ flex: 1 }} />
            <span>to</span>
            <input name="shift_end" type="time" defaultValue={v("shift_end", "17:00")} style={{ flex: 1 }} />
          </div>
        </div>
        <div>
          <label>12. Picture</label>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} />
          {cropFile && <ImageCropper file={cropFile} outW={256} round onDone={(d) => { setPic(d); setCropFile(null); }} onCancel={() => setCropFile(null)} />}
          {pic && /* eslint-disable-next-line @next/next/no-img-element */ <img src={pic} alt="" className="avatar" style={{ width: 56, height: 56, marginTop: 8 }} />}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <label>13. Admin rights (optional, for heads like Head of Sales / Head of Production)</label>
        <div className="pj-members" style={{ maxHeight: "none" }}>
          {PERM_LIST.map((p) => (
            <label key={p.key}><input type="checkbox" name="perms" value={p.key} defaultChecked={(initial?.perms ?? []).includes(p.key)} />{p.label}</label>
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
      <div style={{ marginTop: 14 }}><button className="btn">{id ? "Save changes" : "Create user"}</button></div>
    </form>
  );
}
