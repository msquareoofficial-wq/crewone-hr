// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";

// Running time since a break started (ticks every second). `start` is an ISO timestamp.
export default function BreakTimer({ start }: { start: string }) {
  const t0 = new Date(start).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const sec = Math.max(0, Math.floor((now - t0) / 1000));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return <span className="bk-time">{h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`}</span>;
}
