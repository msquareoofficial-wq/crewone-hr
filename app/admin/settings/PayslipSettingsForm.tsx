// Powered By Vistech Force
"use client";
import { useState } from "react";
import type { PayslipSettings, CustomField } from "@/lib/payslip-settings";
import { SYSTEM_SOURCES, DEFAULT_FIELDS } from "@/lib/payslip-settings";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function PayslipSettingsForm({ initial }: { initial: PayslipSettings }) {
  const [form, setForm] = useState<PayslipSettings>({
    ...initial,
    logo: initial.logo ?? "",
    custom_fields: initial.custom_fields?.length ? initial.custom_fields : DEFAULT_FIELDS,
  });
  const [msg, setMsg] = useState<{ t: string; m: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PayslipSettings>(k: K, v: PayslipSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── Logo ──
  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        set("logo", canvas.toDataURL("image/png"));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ── Custom fields ──
  function updateField(id: string, patch: Partial<CustomField>) {
    setForm((f) => ({
      ...f,
      custom_fields: f.custom_fields.map((cf) => (cf.id === id ? { ...cf, ...patch } : cf)),
    }));
  }

  function removeField(id: string) {
    setForm((f) => ({ ...f, custom_fields: f.custom_fields.filter((cf) => cf.id !== id) }));
  }

  function addField() {
    setForm((f) => ({
      ...f,
      custom_fields: [...f.custom_fields, { id: uid(), label: "", type: "earning", source: "base_salary" }],
    }));
  }

  function moveField(id: string, dir: -1 | 1) {
    setForm((f) => {
      const arr = [...f.custom_fields];
      const i = arr.findIndex((cf) => cf.id === id);
      if (i < 0) return f;
      const j = i + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...f, custom_fields: arr };
    });
  }

  function resetFields() {
    setForm((f) => ({ ...f, custom_fields: DEFAULT_FIELDS.map((x) => ({ ...x, id: uid() })) }));
  }

  // ── Save ──
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

  const colorInput = (label: string, key: "header_color" | "header_text_color" | "accent_color", placeholder: string) => (
    <label>
      {label}
      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <input
          type="color"
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          style={{ width: 44, height: 36, padding: 2, border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
        />
        <input
          type="text"
          value={form[key]}
          maxLength={7}
          onChange={(e) => set(key, e.target.value)}
          style={{ width: 100 }}
          placeholder={placeholder}
        />
      </div>
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Logo ── */}
      <div>
        <label style={{ marginBottom: 8, display: "block" }}>Company logo on payslip</label>
        <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {form.logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={form.logo} alt="Logo preview" style={{ height: 48, maxWidth: 200, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 6, padding: 4, background: "#fff" }} />
          ) : (
            <div style={{ height: 48, width: 160, border: "1px dashed var(--line)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--mute)" }}>
              No logo — uses brand logo
            </div>
          )}
          <input type="file" accept="image/*" id="ps-logo-file" hidden onChange={handleLogoFile} />
          <button type="button" className="btn sec sm" onClick={() => document.getElementById("ps-logo-file")?.click()}>
            {form.logo ? "Change logo" : "Upload logo"}
          </button>
          {form.logo && (
            <button type="button" className="btn sec sm" onClick={() => set("logo", "")}>Remove</button>
          )}
        </div>
        <div className="mute" style={{ fontSize: 12, marginTop: 4 }}>PNG or JPG, any size — will be shown at 44px height on payslip</div>
      </div>

      {/* ── Colors ── */}
      <div className="grid g2" style={{ gap: 16 }}>
        {colorInput("Header background color", "header_color", "#0f172a")}
        {colorInput("Header text color", "header_text_color", "#ffffff")}
        {colorInput("Net salary box color", "accent_color", "#0f172a")}
      </div>

      {/* ── Currency ── */}
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

      {/* ── Address ── */}
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

      {/* ── Custom fields ── */}
      <div>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ margin: 0 }}>Payslip fields (earnings &amp; deductions)</label>
          <button type="button" className="btn sec sm" onClick={resetFields}>Reset to default</button>
        </div>
        <div className="mute" style={{ fontSize: 12, marginBottom: 10 }}>
          Define what appears in the breakdown section. Earnings are shown in green, deductions in red. Net salary is always the stored payroll value.
        </div>

        <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 160px 90px 72px", gap: 0, background: "var(--surface)", padding: "8px 12px", borderBottom: "1px solid var(--line)", fontSize: 11, fontWeight: 600, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".04em" }}>
            <span>Label</span>
            <span>Type</span>
            <span>Source / Value</span>
            <span>Amount</span>
            <span></span>
          </div>

          {form.custom_fields.map((cf, i) => (
            <div key={cf.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 160px 90px 72px", gap: 0, padding: "7px 12px", borderBottom: i < form.custom_fields.length - 1 ? "1px solid var(--line)" : "none", alignItems: "center" }}>
              {/* Label */}
              <input
                type="text"
                value={cf.label}
                maxLength={40}
                placeholder="e.g. HRA, Tax"
                onChange={(e) => updateField(cf.id, { label: e.target.value })}
                style={{ fontSize: 13, padding: "5px 8px", marginRight: 8 }}
              />
              {/* Type */}
              <select
                value={cf.type}
                onChange={(e) => updateField(cf.id, { type: e.target.value as CustomField["type"] })}
                style={{ fontSize: 12, padding: "5px 6px", marginRight: 8, color: cf.type === "deduction" ? "#dc2626" : cf.type === "earning" ? "#16a34a" : "inherit" }}
              >
                <option value="earning">Earning (+)</option>
                <option value="deduction">Deduction (−)</option>
                <option value="neutral">Neutral</option>
              </select>
              {/* Source */}
              <select
                value={cf.source}
                onChange={(e) => updateField(cf.id, { source: e.target.value, value: "" })}
                style={{ fontSize: 12, padding: "5px 6px", marginRight: 8 }}
              >
                {SYSTEM_SOURCES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              {/* Manual value */}
              {cf.source === "manual" ? (
                <input
                  type="number"
                  value={cf.value ?? ""}
                  min={0}
                  placeholder="0"
                  onChange={(e) => updateField(cf.id, { value: e.target.value })}
                  style={{ fontSize: 13, padding: "5px 8px", marginRight: 8 }}
                />
              ) : (
                <div style={{ fontSize: 12, color: "var(--mute)", padding: "5px 0" }}>from payroll</div>
              )}
              {/* Actions */}
              <div className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
                <button type="button" title="Move up" onClick={() => moveField(cf.id, -1)} disabled={i === 0}
                  style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button type="button" title="Move down" onClick={() => moveField(cf.id, 1)} disabled={i === form.custom_fields.length - 1}
                  style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12, opacity: i === form.custom_fields.length - 1 ? 0.3 : 1 }}>↓</button>
                <button type="button" title="Remove" onClick={() => removeField(cf.id)}
                  style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 13, color: "#dc2626" }}>×</button>
              </div>
            </div>
          ))}

          {form.custom_fields.length === 0 && (
            <div style={{ padding: "16px 12px", color: "var(--mute)", fontSize: 13, textAlign: "center" }}>
              No fields — add one below
            </div>
          )}
        </div>

        <button type="button" className="btn sec sm" onClick={addField} style={{ marginTop: 8 }}>
          + Add field
        </button>
      </div>

      {/* ── Footer note ── */}
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

      {/* ── Signature line ── */}
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
        <a className="btn sec" style={{ marginLeft: 8 }} href="/api/payslip/preview" target="_blank" rel="noreferrer">
          Preview
        </a>
      </div>
    </div>
  );
}
