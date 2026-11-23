// Powered By Vistech Force
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

export default function NavMore({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({});
  const [topNav, setTopNav] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const path = usePathname() || "";
  const active = items.some((i) => path.startsWith(i.href));

  // detect top-nav mode and watch for changes
  useEffect(() => {
    const check = () => setTopNav(document.documentElement.dataset.nav === "top");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nav"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setOpen(false); }, [path]);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      if (btnRef.current && topNav) {
        const rect = btnRef.current.getBoundingClientRect();
        setPopStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, zIndex: 200 });
      }
    };
    updatePos();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.(".more") && !t.closest?.(".more-pop-portal")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    if (topNav) window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
      if (topNav) window.removeEventListener("resize", updatePos);
    };
  }, [open, topNav]);

  const popup = (
    <div className={`more-pop${topNav ? " more-pop-portal" : ""}`} style={topNav ? popStyle : {}}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={path.startsWith(i.href) ? "on" : ""}>{i.label}</Link>
      ))}
    </div>
  );

  return (
    <div className="more">
      <button ref={btnRef} type="button" className={"more-btn" + (active ? " act" : "")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        More <span className="more-caret">{String.fromCharCode(0x25BE)}</span>
      </button>
      {open && (topNav && typeof document !== "undefined" ? createPortal(popup, document.body) : popup)}
    </div>
  );
}
