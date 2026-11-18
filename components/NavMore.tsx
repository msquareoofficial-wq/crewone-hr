// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavMore({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname() || "";
  const active = items.some((i) => path.startsWith(i.href));

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.(".more")) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="more">
      <button type="button" className={"more-btn" + (active ? " act" : "")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        More <span className="more-caret">{String.fromCharCode(0x25BE)}</span>
      </button>
      {open && (
        <div className="more-pop">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={path.startsWith(i.href) ? "on" : ""}>{i.label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
