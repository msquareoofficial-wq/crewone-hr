// Powered By Vistech Force
import Link from "next/link";

type Crumb = { href?: string; label: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="bc-nav" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={i} className="bc-item">
          {i > 0 && <span className="bc-sep" aria-hidden="true">/</span>}
          {c.href
            ? <Link href={c.href} className="bc-link">{c.label}</Link>
            : <span className="bc-cur" aria-current="page">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}
