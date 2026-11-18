// Powered By Vistech Force
// Break categories. Safe to import from client and server code.
export const BREAK_CATS = [
  { key: "lunch", label: "Lunch / Dinner", short: "Lunch" },
  { key: "call", label: "Call", short: "Call" },
  { key: "smoking", label: "Smoking", short: "Smoking" },
  { key: "meeting", label: "Meeting", short: "Meeting" },
  { key: "other", label: "Other", short: "Other" },
] as const;
export type BreakCat = (typeof BREAK_CATS)[number]["key"];
export const catKey = (c: string | null | undefined): BreakCat => (BREAK_CATS.some((x) => x.key === c) ? (c as BreakCat) : "other");
export const catLabel = (c: string | null | undefined) => BREAK_CATS.find((x) => x.key === catKey(c))!.label;

export const CAT_ICON: Record<BreakCat, string[]> = {
  lunch: ["M6 3v7a2 2 0 0 0 4 0V3", "M8 3v18", "M17 3c-2 2-3 4-3 7 0 2 1 3 3 3v8"],
  call: ["M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"],
  smoking: ["M3 15h13v4H3z", "M19 15v4", "M22 15v4", "M19 11c0-2 2-2 2-4 0-1-1-2-2-2"],
  meeting: ["M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1", "M9.5 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z", "M21 20v-1a4 4 0 0 0-3-3.9", "M16 4.1a3.5 3.5 0 0 1 0 7"],
  other: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7v5l3 2"],
};
