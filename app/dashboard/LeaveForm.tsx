// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaveForm({ today }: { today: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <form className="grid" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const f = Object.fromEntries(new FormData(form).entries());
      const r = await fetch("/api/leaves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Error"); setOk(false); return; }
      setErr(""); setOk(true); form.reset(); router.refresh();
    }}>
      <div className="row">
        <div style={{ flex: 1 }}><label>From</label><input type="date" name="start_date" min={today} required /></div>
        <div style={{ flex: 1 }}><label>To</label><input type="date" name="end_date" min={today} required /></div>
      </div>
      <div><label>Reason</label><input name="reason" required /></div>
      {err && <div className="err">{err}</div>}
      {ok && <div className="okmsg">Request sent to admin</div>}
      <button className="btn">Apply for leave</button>
    </form>
  );
}
