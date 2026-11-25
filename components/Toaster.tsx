// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getToasts, getExiting, subscribe, type ToastType } from "@/lib/toast";

const ICONS: Record<ToastType, string> = {
  ok:   "✓",
  bad:  "✕",
  warn: "⚠",
  info: "ℹ",
};

export default function Toaster() {
  const [toasts, setToasts] = useState(getToasts);
  const [exiting, setExiting] = useState(getExiting);
  useEffect(() => subscribe(() => {
    setToasts([...getToasts()]);
    setExiting(new Set(getExiting()));
  }), []);
  if (!toasts.length || typeof document === "undefined") return null;
  return createPortal(
    <div className="ac-toasts" role="log" aria-live="polite" aria-atomic="false" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={`ac-toast ac-toast-${t.type}${exiting.has(t.id) ? " ac-toast-out" : ""}`}>
          <span className="ac-toast-ic" aria-hidden="true">{ICONS[t.type]}</span>
          <span className="ac-toast-msg">{t.msg}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}
