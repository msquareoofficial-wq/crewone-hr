// Powered By Vistech Force
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Uplifting verses, picked by day. Text is fetched live from alquran.cloud (never typed by hand).
const AYAT = [
  "94:5", "94:6", "94:7", "2:286", "65:2", "65:3", "13:28", "39:53", "3:139", "2:153",
  "12:87", "3:159", "2:152", "14:7", "29:69", "53:39", "64:11", "39:10", "2:45", "2:216",
  "3:173", "40:60", "2:186", "20:25", "93:3", "93:5", "13:11", "16:128", "8:46", "3:200",
];

const QUOTES = [
  "Small steps taken every day beat big plans made once.",
  "Do the work today that your future self will thank you for.",
  "A calm mind and a clear goal can move mountains.",
  "Progress, not perfection, is what counts.",
  "Be so consistent that excellence becomes your habit.",
  "Your effort today is the foundation of tomorrow's success.",
  "Start where you are. Use what you have. Do what you can.",
  "Hard work quietly done speaks louder than big words.",
  "Every expert was once a beginner who refused to quit.",
  "Focus on the next right step, not the whole staircase.",
  "Great teams are built on trust, respect and showing up.",
  "Mistakes are proof that you are trying.",
  "Discipline is choosing what you want most over what you want now.",
  "Make today count. It will not come again.",
  "Kindness at work costs nothing and changes everything.",
  "Dreams need plans, and plans need action.",
  "Patience and persistence turn the ordinary into the extraordinary.",
  "Your attitude decides how far your skill can take you.",
  "Lift others up and you rise with them.",
  "Finish what you started. Future you is watching.",
  "Energy flows where attention goes.",
  "Challenges are chances to grow stronger.",
  "Be proud of how far you have come, and keep going.",
  "Quality is doing the right thing even when nobody is checking.",
  "One focused hour beats a distracted day.",
  "Courage is taking the next step while still afraid.",
  "Learn something new today, however small.",
  "Good things take time. Keep building.",
  "Teamwork turns individual effort into shared success.",
  "Rest when you must, but never give up.",
  "Today is a fresh page. Write something you are proud of.",
];

type Ed = { edition: { identifier: string }; text: string; surah: { englishName: string; number: number }; numberInSurah: number };

async function getAyah(ref: string) {
  try {
    const r = await fetch(`https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,ur.jalandhry,en.sahih`, { next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const j = await r.json();
    const d: Ed[] = j?.data;
    if (!Array.isArray(d)) return null;
    const by = (id: string) => d.find((x) => x.edition?.identifier === id);
    const ar = by("quran-uthmani"), ur = by("ur.jalandhry"), en = by("en.sahih");
    if (!ar?.text) return null;
    return {
      ar: ar.text, ur: ur?.text || "", en: en?.text || "",
      ref: `Surah ${ar.surah.englishName} (${ar.surah.number}:${ar.numberInSurah})`,
    };
  } catch { return null; }
}

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Same pick for everyone on a given day (Karachi date)
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const day = Math.floor(Date.parse(date + "T00:00:00Z") / 86400000);
  const ayah = await getAyah(AYAT[day % AYAT.length]);
  const quote = QUOTES[(day * 7) % QUOTES.length];
  return NextResponse.json({ date, ayah, quote });
}
