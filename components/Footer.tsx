// Powered By Vistech Force
import { BRAND } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="foot">
      Powered by{" "}
      <a href={BRAND.poweredByUrl} target="_blank" rel="noopener noreferrer">{BRAND.poweredBy}</a>
    </footer>
  );
}
