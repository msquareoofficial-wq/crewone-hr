// Powered By Vistech Force
"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Marks the current sidebar link as active (adds class "on").
export default function NavActive() {
  const path = usePathname() || "";
  useEffect(() => {
    document.querySelectorAll(".top nav > a").forEach((a) => {
      const h = a.getAttribute("href") || "";
      const on = h === "/admin" ? path === h : path === h || path.startsWith(h + "/");
      a.classList.toggle("on", on);
    });
  }, [path]);
  return null;
}
