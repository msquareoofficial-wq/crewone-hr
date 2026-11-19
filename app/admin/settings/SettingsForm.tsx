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
      <div><label>Company timezone</label>
        <select name="timezone" defaultValue={s.timezone}>
          <optgroup label="United States">
            <option value="America/New_York">US Eastern (EST/EDT)</option>
            <option value="America/Chicago">US Central (CST/CDT)</option>
            <option value="America/Denver">US Mountain (MST/MDT)</option>
            <option value="America/Los_Angeles">US Pacific (PST/PDT)</option>
          </optgroup>
          <optgroup label="Pakistan / Middle East">
            <option value="Asia/Karachi">Pakistan (PKT, UTC+5)</option>
            <option value="Asia/Dubai">Dubai (GST, UTC+4)</option>
            <option value="Asia/Riyadh">Riyadh (AST, UTC+3)</option>
          </optgroup>
          <optgroup label="Other">
            <option value="UTC">UTC</option>
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="Asia/Kolkata">India (IST, UTC+5:30)</option>
          </optgroup>
        </select>
      </div>
      {msg && <div className={msg.t}>{msg.m}</div>}
      <button className="btn">Save</button>
    </form>
  );
}
