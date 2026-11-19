// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NavKey } from "@/lib/db";

const NAV_ITEMS: { key: NavKey; placeholder: string }[] = [
  { key: "admindash", placeholder: "Dashboard" },
  { key: "users", placeholder: "Users" },
  { key: "notifications", placeholder: "Notifications" },
  { key: "leaves", placeholder: "Leaves" },
  { key: "calendar", placeholder: "Calendar" },
  { key: "corrections", placeholder: "Corrections" },
  { key: "reports", placeholder: "Reports" },
  { key: "performance", placeholder: "Performance" },
  { key: "payroll", placeholder: "Payroll" },
  { key: "finance", placeholder: "Finance" },
  { key: "activity", placeholder: "Activity" },
  { key: "settings", placeholder: "Settings" },
];

export default function NavLabelsForm({ labels }: { labels: Record<NavKey, string> }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.currentTarget).entries());
      const r = await fetch("/api/admin/nav-labels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json();
      setMsg(r.ok ? { t: "okmsg", m: "Nav labels saved — reload to see changes" } : { t: "err", m: j.error });
      if (r.ok) router.refresh();
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", maxWidth: 600 }}>
        {NAV_ITEMS.map(({ key, placeholder }) => (
          <div key={key}>
            <label style={{ fontSize: "0.82rem", color: "var(--mute)" }}>{placeholder}</label>
            <input name={key} defaultValue={labels[key]} placeholder={placeholder} maxLength={40} style={{ width: "100%" }} />
          </div>
        ))}
      </div>
      {msg && <div className={msg.t} style={{ marginTop: 10 }}>{msg.m}</div>}
      <button className="btn" style={{ marginTop: 14 }}>Save nav labels</button>
    </form>
  );
}
