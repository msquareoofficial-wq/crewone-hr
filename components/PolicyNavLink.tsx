// Powered By Vistech Force
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PolicyNavLink() {
  const path = usePathname() || "";
  const on = path === "/policy" || path.startsWith("/policy/");
  return (
    <Link href="/policy" className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
      Policy
    </Link>
  );
}
