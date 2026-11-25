// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 14;

function wasDismissed() {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < DISMISS_DAYS * 86400000;
  } catch { return false; }
}

function isStandalone() {
  return typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (ios && safari) {
      setIsIos(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setShow(false);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="install-banner" role="banner" aria-label="Install app">
      <div className="install-inner">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <div className="install-text">
          <strong>Install CrewOne</strong>
          {isIos
            ? <span>Tap <b>Share</b> then <b>Add to Home Screen</b></span>
            : <span>Add to your home screen for quick access</span>}
        </div>
        {!isIos && (
          <button className="btn sm" onClick={install}>Install</button>
        )}
        <button className="install-close" onClick={dismiss} aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}
