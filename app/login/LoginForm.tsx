// Powered By Vistech Force
"use client";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

export default function LoginForm() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: f.get("identifier"), password: f.get("password") }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.error || "Login failed");
      setBusy(false);
      return;
    }
    window.location.href = j.role === "admin" ? "/admin" : "/dashboard";
  }
  return (
    <form onSubmit={submit} className="grid">
      <div>
        <label>Employee ID or Email</label>
        <input name="identifier" autoFocus required />
      </div>
      <div>
        <label>Password</label>
        <PasswordInput name="password" required autoComplete="current-password" />
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
    </form>
  );
}
