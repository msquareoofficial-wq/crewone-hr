// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageCropper from "@/components/ImageCropper";

export default function AdminPicture({ picture }: { picture: string | null }) {
  const router = useRouter();
  const [pic, setPic] = useState<string | null>(picture);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);
  async function save(p: string | null) {
    try {
      const r = await fetch("/api/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ picture: p }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      setMsg(r.ok ? { t: "okmsg", m: "Picture saved" } : { t: "err", m: j.error || "Error" });
      if (r.ok) router.refresh();
    } catch { setMsg({ t: "err", m: "Network error" }); }
  }
  return (
    <div className="grid" style={{ maxWidth: 420 }}>
      <div className="row">
        {pic ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={pic} alt="" className="avatar" style={{ width: 64, height: 64 }} /> : <span className="avatar" style={{ width: 64, height: 64 }}>A</span>}
        <input type="file" accept="image/*" style={{ flex: 1 }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} />
      </div>
      {cropFile && <ImageCropper file={cropFile} outW={256} round onDone={(d) => { setPic(d); save(d); setCropFile(null); }} onCancel={() => setCropFile(null)} />}
      {pic && <div><button className="btn sec sm" onClick={() => { setPic(null); save(null); }}>Remove picture</button></div>}
      {msg && <div className={msg.t}>{msg.m}</div>}
    </div>
  );
}
