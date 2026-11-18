// Powered By Vistech Force
"use client";
import { useEffect, useState } from "react";

// Change these three lines to move the widget to another city.
const CITY = "Karachi";
const LAT = 24.8607;
const LON = 67.0011;
const TZ = "Asia/Karachi";
const TZ_LABEL = "PKT";
const CACHE_KEY = "cw_weather_v1";
const CACHE_MS = 20 * 60 * 1000;
const cp = (...n: number[]) => String.fromCodePoint(...n);
const NL = String.fromCharCode(10);

type Wx = { t: number; code: number; day: boolean; at: number };

function describe(code: number, day: boolean): { icon: string; text: string } {
  if (code === 0) return day ? { icon: cp(0x2600, 0xFE0F), text: "Clear" } : { icon: cp(0x1F319), text: "Clear" };
  if (code === 1 || code === 2) return day ? { icon: cp(0x26C5), text: "Partly cloudy" } : { icon: cp(0x2601, 0xFE0F), text: "Partly cloudy" };
  if (code === 3) return { icon: cp(0x2601, 0xFE0F), text: "Cloudy" };
  if (code === 45 || code === 48) return { icon: cp(0x1F32B, 0xFE0F), text: "Fog" };
  if (code >= 51 && code <= 57) return { icon: cp(0x1F326, 0xFE0F), text: "Drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { icon: cp(0x1F327, 0xFE0F), text: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: cp(0x2744, 0xFE0F), text: "Snow" };
  if (code >= 95) return { icon: cp(0x26C8, 0xFE0F), text: "Thunderstorm" };
  return { icon: cp(0x2601, 0xFE0F), text: "Cloudy" };
}

function fmt(d: Date, tz: string, opts: Intl.DateTimeFormatOptions) {
  try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(d); } catch { return ""; }
}

export default function ClockWeather() {
  const [now, setNow] = useState<Date | null>(null);
  const [wx, setWx] = useState<Wx | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let dead = false;
    async function load() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw) as Wx;
          if (Date.now() - c.at < CACHE_MS) { if (!dead) setWx(c); return; }
        }
      } catch {}
      try {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=" + LAT + "&longitude=" + LON +
          "&current=temperature_2m,weather_code,is_day&timezone=auto";
        const r = await fetch(url);
        if (!r.ok) return;
        const j = await r.json();
        const c = j && j.current;
        if (!c || typeof c.temperature_2m !== "number") return;
        const w: Wx = { t: Math.round(c.temperature_2m), code: Number(c.weather_code), day: c.is_day === 1, at: Date.now() };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(w)); } catch {}
        if (!dead) setWx(w);
      } catch {}
    }
    load();
    const id = setInterval(load, CACHE_MS);
    return () => { dead = true; clearInterval(id); };
  }, []);

  if (!now) return <div className="cw" aria-hidden="true" />;

  const time = fmt(now, TZ, { hour: "2-digit", minute: "2-digit", hour12: true });
  const date = fmt(now, TZ, { weekday: "short", day: "numeric", month: "short" });
  const full = fmt(now, TZ, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const us = fmt(now, "America/New_York", { hour: "2-digit", minute: "2-digit", hour12: true });
  const d = wx ? describe(wx.code, wx.day) : null;
  const title = full + " (" + TZ_LABEL + ") " + NL + "US Eastern: " + us + (wx && d ? NL + CITY + ": " + wx.t + cp(0xB0) + "C, " + d.text : "");

  return (
    <div className="cw" title={title}>
      <span className="cw-t">{time}</span>
      <span className="cw-d">{date}</span>
      {wx && d && (
        <span className="cw-w"><span className="cw-i">{d.icon}</span>{wx.t}{cp(0xB0)}C</span>
      )}
    </div>
  );
}
