// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";

function b64(s: string) {
  const p = "=".repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(Array.from(r).map((c) => c.charCodeAt(0)));
}

export default function PushToggle() {
  const [state, setState] = useState<"na" | "off" | "on" | "denied">("na");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
        if (Notification.permission === "denied") return setState("denied");
        const reg = await navigator.serviceWorker.ready;
        setState((await reg.pushManager.getSubscription()) ? "on" : "off");
      } catch {}
    })();
  }, []);
  if (state === "na" || state === "denied") return null;
  async function toggle() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const cur = await reg.pushManager.getSubscription();
      if (cur) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: cur.endpoint }) });
        await cur.unsubscribe(); setState("off");
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
        const k = await (await fetch("/api/push")).json();
        if (!k.key) { alert("Alerts are not set up on the server yet."); return; }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) });
        await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
        setState("on");
      }
    } catch {}
    setBusy(false);
  }
  return <button type="button" className="btn sec sm" disabled={busy} onClick={toggle} title="Get alerts on this device">{state === "on" ? "Alerts: On" : "Alerts: Off"}</button>;
}
