// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProjectsNavLink() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let off = false;
    const run = async () => {
      try { const r = await fetch("/api/projects/notifications"); if (r.ok && !off) setN((await r.json()).count || 0); } catch {}
    };
    run();
    const t = setInterval(run, 15000);
    return () => { off = true; clearInterval(t); };
  }, []);
  return <Link href="/projects">Projects{n > 0 && <span className="nav-badge">{n > 99 ? "99+" : n}</span>}</Link>;
}
