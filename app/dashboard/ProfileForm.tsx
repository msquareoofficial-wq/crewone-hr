// Powered By Vistech Force
"use client";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { useRouter } from "next/navigation";
import ImageCropper from "@/components/ImageCropper";

export default function ProfileForm({ user }: { user: { pseudo_name: string | null; picture: string | null; phone: string | null } }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const [pic, setPic] = useState<string | null>(user.picture);
  const [cropFile, setCropFile] = useState<File | null>(null);

  async function save(body: any) {
    const r = await fetch("/api/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? { t: "ok", m: "Saved" } : { t: "err", m: j.error || "Error" });
    if (r.ok) router.refresh();
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
        <form className="grid" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); if (await save({ currentPassword: f.get("cur"), newPassword: f.get("new") })) (e.target as HTMLFormElement).reset(); }}>
          <div><label>Current password</label><PasswordInput name="cur" required autoComplete="current-password" /></div>
          <div><label>New password (min 8)</label><PasswordInput name="new" required minLength={8} autoComplete="new-password" /></div>
          <button className="btn sec">Change password</button>
        </form>
        {msg && <div className={msg.t === "ok" ? "okmsg" : "err"}>{msg.m}</div>}
      </div>
    </div>
  );
}
