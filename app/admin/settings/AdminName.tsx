// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminName({ name, designation }: { name: string; designation: string | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);
  return (
    <form className="grid" style={{ maxWidth: 420 }} onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const r = await fetch("/api/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.get("name"), designation: f.get("designation") }) });
      let j: any = {}; try { j = await r.json(); } catch {}
      setMsg(r.ok ? { t: "okmsg", m: "Saved" } : { t: "err", m: j.error || "Error" });
      if (r.ok) router.refresh();
    }}>
      <div><label>Display name</label><input name="name" defaultValue={name} required /></div>
      <div><label>Designation (optional)</label><input name="designation" defaultValue={designation ?? ""} placeholder="e.g. HR Manager" /></div>
      {msg && <div className={msg.t}>{msg.m}</div>}
      <button className="btn">Save</button>
    </form>
  );
}
