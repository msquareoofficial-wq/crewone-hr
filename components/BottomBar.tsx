// Powered By Vistech Force
"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

type Tab = { href: string; label: string; icon: React.ReactNode; exact?: boolean };

const ICON_HOME = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ICON_USERS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const ICON_BELL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const ICON_CALENDAR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ICON_FOLDER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);
const ICON_CHAT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const ICON_LEAVES = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 16 11 18 15 14" />
  </svg>
);
const ICON_MORE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" />
  </svg>
);

const ADMIN_TABS: Tab[] = [
  { href: "/admin", label: "Dashboard", icon: ICON_HOME, exact: true },
  { href: "/admin/users", label: "Users", icon: ICON_USERS },
  { href: "/admin/leaves", label: "Leaves", icon: ICON_LEAVES },
  { href: "/admin/notifications", label: "Notices", icon: ICON_BELL },
];

const USER_TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard", icon: ICON_HOME, exact: true },
  { href: "/calendar", label: "Calendar", icon: ICON_CALENDAR },
  { href: "/projects", label: "Projects", icon: ICON_FOLDER },
  { href: "/chat", label: "Chat", icon: ICON_CHAT },
];

export default function BottomBar({ role, children }: { role: string; children: React.ReactNode }) {
  const [sheet, setSheet] = useState(false);
  const path = usePathname();
  const tabs = role === "admin" ? ADMIN_TABS : USER_TABS;

  const isActive = (tab: Tab) =>
    tab.exact ? path === tab.href : path === tab.href || path.startsWith(tab.href + "/");

  return (
    <>
      <nav className="btm-bar" aria-label="Main navigation">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={`btm-tab${isActive(t) ? " btm-on" : ""}`}>
            <span className="btm-ic">{t.icon}</span>
            <span className="btm-lbl">{t.label}</span>
          </Link>
        ))}
        <button type="button" className={`btm-tab${sheet ? " btm-on" : ""}`} onClick={() => setSheet((s) => !s)} aria-label="More navigation">
          <span className="btm-ic">{ICON_MORE}</span>
          <span className="btm-lbl">More</span>
        </button>
      </nav>

      {sheet && (
        <>
          <div className="btm-sheet-ov" onClick={() => setSheet(false)} />
          <div className="btm-sheet" onClick={() => setSheet(false)}>
            <div className="btm-sheet-handle" />
            {children}
          </div>
        </>
      )}
    </>
  );
}
