// Powered By Vistech Force
"use client";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

type E = Record<string, string>;

function validate(name: string, value: string): string {
  if (name === "identifier" && !value.trim()) return "Employee ID or email is required";
  if (name === "password" && !value) return "Password is required";
  return "";
}

export default function LoginForm() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<E>({});
  const [touched, setTouched] = useState<E>({});

  function blur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setTouched((t) => ({ ...t, [name]: "1" }));
    setErrs((prev) => ({ ...prev, [name]: validate(name, value) }));
  }

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (touched[name]) setErrs((prev) => ({ ...prev, [name]: validate(name, value) }));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = String(f.get("identifier") ?? "");
    const pw = String(f.get("password") ?? "");
    const newErrs: E = {
      identifier: validate("identifier", id),
      password: validate("password", pw),
    };
    setErrs(newErrs);
    setTouched({ identifier: "1", password: "1" });
    if (Object.values(newErrs).some(Boolean)) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: id, password: pw }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.error || "Login failed");
      setBusy(false);
      return;
    }
    window.location.href = j.role === "admin" ? "/admin" : "/dashboard";
  }

  const cls = (name: string) => touched[name] ? (errs[name] ? "iv-err" : "iv-ok") : "";

  return (
    <form onSubmit={submit} className="grid">
      <div className="iv-field">
        <label>Employee ID or Email</label>
        <input name="identifier" autoFocus onBlur={blur} onChange={change} className={cls("identifier")} />
        {errs.identifier && <span className="iv-msg">{errs.identifier}</span>}
      </div>
      <div className="iv-field">
        <label>Password</label>
        <PasswordInput name="password" autoComplete="current-password" onBlur={blur} onChange={change} className={cls("password")} />
        {errs.password && <span className="iv-msg">{errs.password}</span>}
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
    </form>
  );
}
