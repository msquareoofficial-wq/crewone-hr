// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

type E = Record<string, string>;

export default function CorrectionForm({ today, items }: { today: string; items: { id: number; work_date: string; req_in: string | null; req_out: string | null; status: string; admin_note: string | null }[] }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<E>({});
  const [touched, setTouched] = useState<E>({});
  const [vals, setVals] = useState({ work_date: "", req_in: "", req_out: "", reason: "" });

  function validate(name: string, value: string, all = vals): string {
    if (name === "work_date" && !value) return "Date is required";
    if (name === "req_in_or_out") {
      if (!all.req_in && !all.req_out) return "Provide at least one of IN or OUT time";
      return "";
    }
    if (name === "reason" && !value.trim()) return "Reason is required";
    return "";
  }

  function blur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setTouched((t) => ({ ...t, [name]: "1" }));
    if (name === "req_in" || name === "req_out") {
      setErrs((prev) => ({ ...prev, req_in_or_out: validate("req_in_or_out", value) }));
    } else {
      setErrs((prev) => ({ ...prev, [name]: validate(name, value) }));
    }
  }

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const next = { ...vals, [name]: value };
    setVals(next);
    if (name === "req_in" || name === "req_out") {
      if (touched.req_in || touched.req_out)
        setErrs((prev) => ({ ...prev, req_in_or_out: validate("req_in_or_out", value, next) }));
    } else if (touched[name]) {
      setErrs((prev) => ({ ...prev, [name]: validate(name, value, next) }));
    }
  }

  const cls = (name: string) => touched[name] ? (errs[name] ? "iv-err" : "iv-ok") : "";

  return (
    <div>
      <form className="grid" onSubmit={async (e) => {
        e.preventDefault();
        const allErrs: E = {
          work_date: validate("work_date", vals.work_date),
          req_in_or_out: validate("req_in_or_out", "", vals),
          reason: validate("reason", vals.reason),
        };
        setErrs(allErrs);
        setTouched({ work_date: "1", req_in: "1", req_out: "1", reason: "1" });
        if (Object.values(allErrs).some(Boolean)) return;
        setBusy(true);
        const r = await fetch("/api/corrections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vals) });
        let j: any = {}; try { j = await r.json(); } catch {}
        setBusy(false);
        if (!r.ok) { toast(j.error || "Could not submit request", "bad"); setErr(j.error || "Error"); return; }
        setErr("");
        setVals({ work_date: "", req_in: "", req_out: "", reason: "" });
        setTouched({});
        toast("Correction request sent to admin", "ok");
        router.refresh();
      }}>
        <div className="iv-field">
          <label>Date</label>
          <input type="date" name="work_date" max={today} value={vals.work_date} onBlur={blur} onChange={change} className={cls("work_date")} />
          {errs.work_date && <span className="iv-msg">{errs.work_date}</span>}
        </div>
        <div>
          <div className="row">
            <div className="iv-field" style={{ flex: 1 }}>
              <label>Correct IN time</label>
              <input type="time" name="req_in" value={vals.req_in} onBlur={blur} onChange={change} />
            </div>
            <div className="iv-field" style={{ flex: 1 }}>
              <label>Correct OUT time</label>
              <input type="time" name="req_out" value={vals.req_out} onBlur={blur} onChange={change} />
            </div>
          </div>
          {errs.req_in_or_out && <span className="iv-msg" style={{ marginTop: 4 }}>{errs.req_in_or_out}</span>}
        </div>
        <div className="iv-field">
          <label>Reason</label>
          <input name="reason" placeholder="e.g. forgot to click OUT" value={vals.reason} onBlur={blur} onChange={change} className={cls("reason")} />
          {errs.reason && <span className="iv-msg">{errs.reason}</span>}
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? "Submitting..." : "Request correction"}</button>
      </form>
      {items.length > 0 && (
        <div className="scroll" style={{ marginTop: 14 }}><table>
          <thead><tr><th>Date</th><th>IN</th><th>OUT</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>{items.map((c) => (
            <tr key={c.id}><td>{c.work_date}</td><td>{c.req_in ?? "-"}</td><td>{c.req_out ?? "-"}</td>
              <td><span className={`badge ${c.status === "approved" ? "b-ok" : c.status === "rejected" ? "b-bad" : "b-warn"}`}>{c.status}</span></td><td>{c.admin_note ?? "-"}</td></tr>))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
