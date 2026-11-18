// Powered By Vistech Force
import { CAT_ICON, catKey } from "@/lib/breakcats";

export default function CatIcon({ cat, size = 20 }: { cat: string | null | undefined; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {CAT_ICON[catKey(cat)].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
