// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaveDecision({ id, change }: { id: number; change?: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  async function set(status: string) {
    await fetch(`/api/leaves/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) });
    router.refresh();
  }
  return (
    <div className="row">
      <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: 160 }} />
      <button className="btn ok sm" onClick={() => set("approved")}>Approve</button>
      <button className="btn bad sm" onClick={() => set("rejected")}>Reject</button>
      {change && <button className="btn sec sm" onClick={() => set("pending")}>Reopen</button>}
    </div>
  );
}
