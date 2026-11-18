// Powered By Vistech Force
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageCropper from "@/components/ImageCropper";

type Props = { light: string; dark: string; customLight: boolean; customDark: boolean };

export default function BrandingForm({ light, dark, customLight, customDark }: Props) {
  const router = useRouter();
  const [newLight, setNewLight] = useState<string | null>(null);
  const [newDark, setNewDark] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ file: File; key: "light" | "dark" } | null>(null);
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);

  async function send(body: any, ok: string) {
    try {
      const r = await fetch("/api/branding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      let j: any = {};
      try { j = await r.json(); } catch {}
      if (!r.ok) return setMsg({ t: "err", m: j.error || `Save failed (${r.status})` });
      setMsg({ t: "okmsg", m: ok });
      setNewLight(null); setNewDark(null);
      router.refresh();
    } catch {
      setMsg({ t: "err", m: "Network error, please try again" });
    }
  }

  const block = (title: string, hint: string, bg: string, current: string, pending: string | null, custom: boolean, set: (v: string | null) => void, key: "light" | "dark") => (
    <div>
      <label>{title}</label>
      <div style={{ background: bg, borderRadius: 8, padding: 14, marginBottom: 8, minHeight: 64, display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pending ?? current} alt="" style={{ height: 40, width: "auto", maxWidth: "100%" }} />
      </div>
      <div className="mute" style={{ marginBottom: 6 }}>{hint}</div>
      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setMsg(null); setCrop({ file: f, key }); } e.target.value = ""; }} />
      {custom && <button type="button" className="btn sec sm" style={{ marginTop: 8 }} onClick={() => confirm("Reset this logo to the default?") && send({ [key]: null }, "Logo reset to default")}>Reset to default</button>}
    </div>
  );

  return (
    <div className="grid">
      <div className="form">
        {block("Header logo", "Used on dark backgrounds: the sidebar in dark mode, the mobile top bar and the purple login panel. Use a white or light logo.", "#111827", light, newLight, customLight, setNewLight, "light")}
        {block("Login page logo", "Used on light backgrounds: the sidebar in light mode and the login form. Use a dark logo.", "#ffffff", dark, newDark, customDark, setNewDark, "dark")}
      </div>
      {crop && <ImageCropper file={crop.file} aspect={3} outW={600} format="png" maxLen={450_000} bg={crop.key === "light" ? "#111827" : "#ffffff"} onDone={(d) => { (crop.key === "light" ? setNewLight : setNewDark)(d); setCrop(null); }} onCancel={() => setCrop(null)} />}
      {msg && <div className={msg.t}>{msg.m}</div>}
      <div><button className="btn" disabled={!newLight && !newDark} onClick={() => send({ ...(newLight ? { light: newLight } : {}), ...(newDark ? { dark: newDark } : {}) }, "Logo saved")}>Save logo</button></div>
    </div>
  );
}
