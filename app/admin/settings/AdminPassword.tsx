// Powered By Vistech Force
"use client";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

export default function AdminPassword() {
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);
  return (
    <form className="grid" style={{ maxWidth: 420 }} onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const f = new FormData(form);
      const r = await fetch("/api/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: f.get("cur"), newPassword: f.get("new") }) });
      const j = await r.json();
      setMsg(r.ok ? { t: "okmsg", m: "Password changed" } : { t: "err", m: j.error || "Error" });
      if (r.ok) form.reset();
    }}>
      <div><label>Current password</label><PasswordInput name="cur" required autoComplete="current-password" /></div>
      <div><label>New password (min 8)</label><PasswordInput name="new" required minLength={8} autoComplete="new-password" /></div>
      {msg && <div className={msg.t}>{msg.m}</div>}
      <button className="btn">Change password</button>
    </form>
  );
}
