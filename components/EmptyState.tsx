// Powered By Vistech Force
import React from "react";

const ICONS: Record<string, React.ReactNode> = {
  chat: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M42 26a4 4 0 0 1-4 4H14l-8 8V10a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v16z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 18h16M16 25h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  finance: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2.5" />
      <path d="M6 18h4M38 18h4M6 30h4M38 30h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="32" height="38" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 18h16M16 25h16M16 32h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 10h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  breaks: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 16h22v18a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V16z" stroke="currentColor" strokeWidth="2.5" />
      <path d="M32 20h2a6 6 0 0 1 0 12h-2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M15 10c0-4 6-4 6-8M22 10c0-4 6-4 6-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 40h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 6a14 14 0 0 1 14 14v8l4 6H6l4-6v-8A14 14 0 0 1 24 6z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 34a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="6" r="2" fill="currentColor" />
    </svg>
  ),
  projects: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 14a4 4 0 0 1 4-4h8l4 4h16a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V14z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 28l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 14v10l6 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  leaves: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M6 20h36" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M15 29h8M15 35h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="2.5" />
      <path d="M6 42c0-9.94 8.06-18 18-18s18 8.06 18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  records: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="32" height="38" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 18h16M16 25h16M16 32h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  corrections: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M34 8l6 6L16 38H10v-6L34 8z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M6 42h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  payroll: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2.5" />
      <path d="M6 18h4M38 18h4M6 30h4M38 30h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 38L16 24l8 8 8-14 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 42h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="14" stroke="currentColor" strokeWidth="2.5" />
      <path d="M32 32l8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

type EmptyIcon = keyof typeof ICONS;

export default function EmptyState({
  icon = "records",
  title,
  sub,
  compact = false,
  action,
}: {
  icon?: EmptyIcon;
  title: string;
  sub?: string;
  compact?: boolean;
  action?: { label: string; href: string };
}) {
  return (
    <div className={`es-wrap${compact ? " es-compact" : ""}`}>
      <span className="es-icon">{ICONS[icon]}</span>
      <strong className="es-title">{title}</strong>
      {sub && <span className="es-sub">{sub}</span>}
      {action && <a href={action.href} className="btn sm" style={{ marginTop: 4 }}>{action.label}</a>}
    </div>
  );
}

export function EmptyRow({ icon, title, sub, cols }: { icon?: EmptyIcon; title: string; sub?: string; cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: "32px 16px" }}>
        <EmptyState icon={icon} title={title} sub={sub} />
      </td>
    </tr>
  );
}
