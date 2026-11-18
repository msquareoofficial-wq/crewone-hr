// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Decide({ id }: { id: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  async function go(status: "approved" | "rejected") {
    const r = await fetch(`/api/corrections/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) });
    let j: any = {}; try { j = await r.json(); } catch {}
    if (!r.ok) return setErr(j.error || "Error");
    router.refresh();
  }
  return (
    <div className="row">
      <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: 160 }} />
      <button className="btn ok sm" onClick={() => go("approved")}>Approve</button>
      <button className="btn bad sm" onClick={() => go("rejected")}>Reject</button>
      {err && <span className="err">{err}</span>}
    </div>
  );
}
