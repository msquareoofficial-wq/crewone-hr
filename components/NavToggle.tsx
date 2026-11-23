"use client";
import { useEffect, useState } from "react";

export default function NavToggle() {
  const [isTop, setIsTop] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nav-layout");
      if (saved === "top") {
        document.documentElement.setAttribute("data-nav", "top");
        setIsTop(true);
      }
    } catch {}
  }, []);

  function toggle() {
    const next = !isTop;
    setIsTop(next);
    try {
      if (next) {
        document.documentElement.setAttribute("data-nav", "top");
        localStorage.setItem("nav-layout", "top");
      } else {
        document.documentElement.removeAttribute("data-nav");
        localStorage.setItem("nav-layout", "sidebar");
      }
    } catch {}
  }

  return (
    <button type="button" className="theme-btn" onClick={toggle} title={isTop ? "Switch to sidebar" : "Switch to top tabs"} aria-label="Toggle nav layout">
      {isTop ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>
        </svg>
      )}
    </button>
  );
}
