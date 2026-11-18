// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ComposeForm() {
  const router = useRouter();
  const [holiday, setHoliday] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  return (
    <form className="grid" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const f: any = Object.fromEntries(new FormData(form).entries());
      const body: any = { title: f.title, body: f.body, audience: f.audience };
      if (holiday) body.holiday = { start: f.hstart, end: f.hend || f.hstart };
      const r = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Error"); setOk(""); return; }
      setErr(""); setOk("Sent"); form.reset(); setHoliday(false); router.refresh();
    }}>
      <div className="form">
        <div><label>Title</label><input name="title" required /></div>
        <div>
          <label>Send to</label>
          <select name="audience" defaultValue="all"><option value="all">All (every user)</option><option value="Sales">Sales only</option><option value="Production">Production only</option></select>
        </div>
      </div>
      <div><label>Message</label><textarea name="body" required rows={4} style={{ width: "100%", padding: 9, border: "1px solid var(--line)", borderRadius: 8, font: "inherit" }} /></div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--ink)" }}>
        <input type="checkbox" checked={holiday} onChange={(e) => setHoliday(e.target.checked)} style={{ width: "auto" }} /> This is a holiday announcement (it will show as an off day in the calendar)
      </label>
      {holiday && (
        <div className="form">
          <div><label>Holiday from</label><input type="date" name="hstart" required /></div>
          <div><label>To (leave empty for a single day)</label><input type="date" name="hend" /></div>
        </div>
      )}
      {err && <div className="err">{err}</div>}
      {ok && <div className="okmsg">{ok}</div>}
      <div><button className="btn">Send</button></div>
    </form>
  );
}
