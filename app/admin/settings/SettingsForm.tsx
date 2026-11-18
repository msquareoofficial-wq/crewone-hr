// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsForm({ s }: { s: { timezone: string; grace_minutes: number; lates_per_off: number; leave_quota: number } }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);
  return (
    <form className="grid" style={{ maxWidth: 420 }} onSubmit={async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.currentTarget).entries());
      const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json();
      setMsg(r.ok ? { t: "okmsg", m: "Settings saved" } : { t: "err", m: j.error });
      if (r.ok) router.refresh();
    }}>
      <div><label>Mark late after (minutes from shift start)</label><input name="grace_minutes" type="number" defaultValue={s.grace_minutes} min={0} /></div>
      <div><label>Number of lates that equal 1 off</label><input name="lates_per_off" type="number" defaultValue={s.lates_per_off} min={1} /></div>
      <div><label>Paid leave days per user per year</label><input name="leave_quota" type="number" defaultValue={s.leave_quota} min={0} /></div>
      <div><label>Company timezone</label><input name="timezone" defaultValue={s.timezone} /></div>
      {msg && <div className={msg.t}>{msg.m}</div>}
      <button className="btn">Save</button>
    </form>
  );
}
