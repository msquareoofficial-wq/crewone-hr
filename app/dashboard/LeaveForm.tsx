// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

type E = Record<string, string>;

export default function LeaveForm({ today }: { today: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<E>({});
  const [touched, setTouched] = useState<E>({});
  const [vals, setVals] = useState({ start_date: "", end_date: "", reason: "" });

  function validate(name: string, value: string, all = vals): string {
    if (name === "start_date" && !value) return "Start date is required";
    if (name === "end_date") {
      if (!value) return "End date is required";
      if (all.start_date && value < all.start_date) return "End date must be on or after start date";
    }
    if (name === "reason" && !value.trim()) return "Reason is required";
    return "";
  }

  function blur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setTouched((t) => ({ ...t, [name]: "1" }));
    setErrs((prev) => ({ ...prev, [name]: validate(name, value) }));
  }

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const next = { ...vals, [name]: value };
    setVals(next);
    if (touched[name]) setErrs((prev) => ({ ...prev, [name]: validate(name, value, next) }));
    if (name === "start_date" && touched.end_date)
      setErrs((prev) => ({ ...prev, end_date: validate("end_date", next.end_date, next) }));
  }

  const cls = (name: string) => touched[name] ? (errs[name] ? "iv-err" : "iv-ok") : "";

  return (
    <form className="grid" onSubmit={async (e) => {
      e.preventDefault();
      const allErrs: E = {
        start_date: validate("start_date", vals.start_date),
        end_date: validate("end_date", vals.end_date),
        reason: validate("reason", vals.reason),
      };
      setErrs(allErrs);
      setTouched({ start_date: "1", end_date: "1", reason: "1" });
      if (Object.values(allErrs).some(Boolean)) return;
      setBusy(true);
      const r = await fetch("/api/leaves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vals) });
      const j = await r.json();
      setBusy(false);
      if (!r.ok) { toast(j.error || "Could not submit request", "bad"); setErr(j.error || "Error"); return; }
      setErr("");
      setVals({ start_date: "", end_date: "", reason: "" });
      setTouched({});
      toast("Leave request sent to admin", "ok");
      router.refresh();
    }}>
      <div className="row">
        <div className="iv-field" style={{ flex: 1 }}>
          <label>From</label>
          <input type="date" name="start_date" min={today} value={vals.start_date} onBlur={blur} onChange={change} className={cls("start_date")} />
          {errs.start_date && <span className="iv-msg">{errs.start_date}</span>}
        </div>
        <div className="iv-field" style={{ flex: 1 }}>
          <label>To</label>
          <input type="date" name="end_date" min={vals.start_date || today} value={vals.end_date} onBlur={blur} onChange={change} className={cls("end_date")} />
          {errs.end_date && <span className="iv-msg">{errs.end_date}</span>}
        </div>
      </div>
      <div className="iv-field">
        <label>Reason</label>
        <input name="reason" value={vals.reason} onBlur={blur} onChange={change} className={cls("reason")} />
        {errs.reason && <span className="iv-msg">{errs.reason}</span>}
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn" disabled={busy}>{busy ? "Submitting..." : "Apply for leave"}</button>
    </form>
  );
}
