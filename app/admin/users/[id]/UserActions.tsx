"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserActions({ id, active, outToday }: { id: number; active: boolean; outToday?: boolean }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function put(body: any) {
    const r = await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) setErr(j.error || "Error"); else { setErr(""); if (j.password) setPw(j.password); router.refresh(); }
  }
  return (
    <div className="row">
      {pw && <span className="okmsg" style={{ margin: 0 }}>New password: <b>{pw}</b></span>}
      {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
      {outToday && <button className="btn warn sm" onClick={() => confirm("Undo OUT and re-open today for this user?") && put({ reopenDay: true })}>Undo OUT (re-open today)</button>}
      <button className="btn sec sm" onClick={() => confirm("Reset this user's password?") && put({ resetPassword: true })}>Reset password</button>
      <button className={`btn sm ${active ? "bad" : "ok"}`} onClick={() => put({ active: !active })}>{active ? "Deactivate" : "Activate"}</button>
    </div>
  );
}
