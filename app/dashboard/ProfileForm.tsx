// Powered By Vistech Force
"use client";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { useRouter } from "next/navigation";
import ImageCropper from "@/components/ImageCropper";
import { toast } from "@/lib/toast";

type E = Record<string, string>;

export default function ProfileForm({ user }: { user: { pseudo_name: string | null; picture: string | null; phone: string | null } }) {
  const router = useRouter();
  const [pic, setPic] = useState<string | null>(user.picture);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pwErrs, setPwErrs] = useState<E>({});
  const [pwTouched, setPwTouched] = useState<E>({});
  const [pwVals, setPwVals] = useState({ cur: "", new: "" });

  function validatePw(name: string, value: string, all = pwVals): string {
    if (name === "cur" && !value) return "Current password is required";
    if (name === "new") {
      if (!value) return "New password is required";
      if (value.length < 8) return "Password must be at least 8 characters";
      if (value === all.cur) return "New password must be different from current";
    }
    return "";
  }

  function pwBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setPwTouched((t) => ({ ...t, [name]: "1" }));
    setPwErrs((prev) => ({ ...prev, [name]: validatePw(name, value) }));
  }

  function pwChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const next = { ...pwVals, [name]: value };
    setPwVals(next);
    if (pwTouched[name]) setPwErrs((prev) => ({ ...prev, [name]: validatePw(name, value, next) }));
  }

  const pwCls = (name: string) => pwTouched[name] ? (pwErrs[name] ? "iv-err" : "iv-ok") : "";

  async function save(body: any) {
    const r = await fetch("/api/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (r.ok) { toast("Saved successfully", "ok"); router.refresh(); }
    else toast(j.error || "Could not save", "bad");
    return r.ok;
  }

  return (
    <div className="grid g2">
      <div className="card">
        <h2>My profile</h2>
        <form className="grid" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save({ pseudo_name: f.get("pseudo_name"), phone: f.get("phone"), picture: pic }); }}>
          <div><label>Pseudo name</label><input name="pseudo_name" defaultValue={user.pseudo_name ?? ""} /></div>
          <div><label>Mobile number</label><input name="phone" defaultValue={user.phone ?? ""} /></div>
          <div>
            <label>Picture</label>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} />
            {cropFile && <ImageCropper file={cropFile} outW={256} round onDone={(d) => { setPic(d); setCropFile(null); }} onCancel={() => setCropFile(null)} />}
            {pic && /* eslint-disable-next-line @next/next/no-img-element */ <img src={pic} alt="" className="avatar" style={{ width: 64, height: 64, marginTop: 8 }} />}
          </div>
          <button className="btn">Save profile</button>
        </form>
      </div>
      <div className="card">
        <h2>Change password</h2>
        <form className="grid" onSubmit={async (e) => {
          e.preventDefault();
          const allErrs: E = {
            cur: validatePw("cur", pwVals.cur),
            new: validatePw("new", pwVals.new),
          };
          setPwErrs(allErrs);
          setPwTouched({ cur: "1", new: "1" });
          if (Object.values(allErrs).some(Boolean)) return;
          if (await save({ currentPassword: pwVals.cur, newPassword: pwVals.new })) {
            setPwVals({ cur: "", new: "" });
            setPwTouched({});
            (e.target as HTMLFormElement).reset();
          }
        }}>
          <div className="iv-field">
            <label>Current password</label>
            <PasswordInput name="cur" autoComplete="current-password" onBlur={pwBlur} onChange={pwChange} className={pwCls("cur")} />
            {pwErrs.cur && <span className="iv-msg">{pwErrs.cur}</span>}
          </div>
          <div className="iv-field">
            <label>New password (min 8 characters)</label>
            <PasswordInput name="new" autoComplete="new-password" minLength={8} onBlur={pwBlur} onChange={pwChange} className={pwCls("new")} />
            {pwVals.new && pwVals.new.length < 8 && pwTouched.new && (
              <div style={{ marginTop: 2 }}>
                <div style={{ height: 4, borderRadius: 2, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (pwVals.new.length / 8) * 100)}%`, background: pwVals.new.length < 5 ? "var(--bad)" : pwVals.new.length < 8 ? "var(--warn)" : "var(--ok)", transition: "width .2s, background .2s" }} />
                </div>
                <span className="iv-hint">{pwVals.new.length}/8 characters</span>
              </div>
            )}
            {pwErrs.new && <span className="iv-msg">{pwErrs.new}</span>}
          </div>
          <button className="btn sec">Change password</button>
        </form>
      </div>
    </div>
  );
}
