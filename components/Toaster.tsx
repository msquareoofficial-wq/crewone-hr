// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getToasts, subscribe, type ToastType } from "@/lib/toast";

const ICONS: Record<ToastType, string> = {
  ok:   "✓",
  bad:  "✕",
  warn: "⚠",
  info: "ℹ",
};

export default function Toaster() {
  const [toasts, setToasts] = useState(getToasts);
  useEffect(() => subscribe(() => setToasts([...getToasts()])), []);
  if (!toasts.length || typeof document === "undefined") return null;
  return createPortal(
    <div className="ac-toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`ac-toast ac-toast-${t.type}`}>
          <span className="ac-toast-ic">{ICONS[t.type]}</span>
          <span className="ac-toast-msg">{t.msg}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}
