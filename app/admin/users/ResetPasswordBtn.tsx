// Powered By Vistech Force
"use client";
import { useState } from "react";

export default function ResetPasswordBtn({ id }: { id: number }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="row">
      <button className="btn sec sm" onClick={async () => {
        if (!confirm("Reset this user's password? The old password will stop working.")) return;
        const r = await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resetPassword: true }) });
        const j = await r.json();
        if (r.ok) { setPw(j.password); setErr(""); } else setErr(j.error || "Error");
      }}>Reset password</button>
      {pw && <span className="okmsg" style={{ margin: 0, padding: "4px 8px" }}>New password: <b>{pw}</b></span>}
      {err && <span className="err" style={{ margin: 0, padding: "4px 8px" }}>{err}</span>}
    </div>
  );
}
