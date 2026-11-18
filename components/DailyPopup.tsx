// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";
import "@fontsource/amiri-quran/arabic-400.css";
import "@fontsource/noto-nastaliq-urdu/arabic-400.css";

type Daily = { date: string; quote: string; ayah: { ar: string; ur: string; en: string; ref: string } | null };

export default function DailyPopup({ userId }: { userId: number }) {
  const [d, setD] = useState<Daily | null>(null);
  const [open, setOpen] = useState(false);
  const key = "daily_seen_v1_" + userId;

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await fetch("/api/daily");
        if (!r.ok) return;
        const j = (await r.json()) as Daily;
        let seen = "";
        try { seen = localStorage.getItem(key) || ""; } catch {}
        if (dead || !j || seen === j.date) return;
        setD(j);
        setTimeout(() => { if (!dead) setOpen(true); }, 500);
      } catch {}
    })();
    return () => { dead = true; };
  }, [key]);

  function close() {
    setOpen(false);
    try { if (d) localStorage.setItem(key, d.date); } catch {}
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !d) return null;
  return (
    <div className="dp-back" onClick={close}>
      <div className="dp-card" role="dialog" aria-modal="true" aria-label="Daily ayah and quote" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dp-x" aria-label="Close" onClick={close}>{String.fromCharCode(215)}</button>
        {d.ayah && (
          <section className="dp-sec">
            <div className="dp-tag">Ayah of the Day</div>
            <p className="dp-ar" dir="rtl" lang="ar">{d.ayah.ar}</p>
            {d.ayah.ur && <p className="dp-ur" dir="rtl" lang="ur">{d.ayah.ur}</p>}
            {d.ayah.en && <p className="dp-en">{d.ayah.en}</p>}
            <div className="dp-ref">{d.ayah.ref}</div>
          </section>
        )}
        <section className="dp-sec dp-q">
          <div className="dp-tag">Motivation of the Day</div>
          <p className="dp-quote">{String.fromCharCode(0x201C)}{d.quote}{String.fromCharCode(0x201D)}</p>
        </section>
        <button type="button" className="btn dp-go" onClick={close}>Start my day</button>
      </div>
    </div>
  );
}
