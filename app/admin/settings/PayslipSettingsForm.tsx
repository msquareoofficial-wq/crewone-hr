// Powered By Vistech Force
"use client";
import { useState } from "react";
import type { PayslipSettings } from "@/lib/payslip-settings";

export default function PayslipSettingsForm({ initial }: { initial: PayslipSettings }) {
  const [form, setForm] = useState<PayslipSettings>(initial);
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof PayslipSettings, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/payslip-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (r.ok) setMsg({ t: "okmsg", m: "Payslip settings saved." });
      else setMsg({ t: "err", m: j.error || "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid g2" style={{ gap: 16 }}>
        {/* Header color */}
        <label>
          Header background color
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <input
              type="color"
              value={form.header_color}
              onChange={(e) => set("header_color", e.target.value)}
              style={{ width: 44, height: 36, padding: 2, border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
            />
            <input
              type="text"
              value={form.header_color}
              maxLength={7}
              onChange={(e) => set("header_color", e.target.value)}
              style={{ width: 100 }}
              placeholder="#0f172a"
            />
          </div>
        </label>

        {/* Accent / net salary box color */}
        <label>
          Net salary box color
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) => set("accent_color", e.target.value)}
              style={{ width: 44, height: 36, padding: 2, border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
            />
            <input
              type="text"
              value={form.accent_color}
              maxLength={7}
              onChange={(e) => set("accent_color", e.target.value)}
              style={{ width: 100 }}
              placeholder="#0f172a"
            />
          </div>
        </label>
      </div>

      {/* Currency */}
      <label>
        Currency symbol
        <input
          type="text"
          value={form.currency}
          onChange={(e) => set("currency", e.target.value)}
          placeholder="e.g. PKR, Rs., $, €"
          maxLength={10}
          style={{ maxWidth: 180, marginTop: 4 }}
        />
        <div className="mute" style={{ marginTop: 2, fontSize: 12 }}>Shown before salary amounts on payslip</div>
      </label>

      {/* Company address */}
      <label>
        Company address (shown under logo)
        <input
          type="text"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="e.g. 123 Business Ave, Lahore, Pakistan"
          maxLength={120}
          style={{ marginTop: 4 }}
        />
      </label>

      {/* Footer note */}
      <label>
        Footer note
        <textarea
          value={form.footer_note}
          onChange={(e) => set("footer_note", e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="e.g. This is a system generated payslip. No signature required."
          style={{ marginTop: 4, resize: "vertical" }}
        />
      </label>

      {/* Signature line */}
      <label className="row" style={{ color: "var(--ink)", fontWeight: 400, gap: 8 }}>
        <input
          type="checkbox"
          style={{ width: "auto" }}
          checked={form.show_signature}
          onChange={(e) => set("show_signature", e.target.checked)}
        />
        Show authorised signature line at bottom of payslip
      </label>

      {msg && <div className={msg.t}>{msg.m}</div>}

      <div>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save payslip settings"}
        </button>
        <a
          className="btn sec"
          style={{ marginLeft: 8 }}
          href="/api/payslip/preview"
          target="_blank"
          rel="noreferrer"
        >
          Preview
        </a>
      </div>
    </div>
  );
}
