// Powered By Vistech Force
import "./globals.css";
import "./chat.css";
import "./dark.css";
import "./extras.css";
import "./polish.css";
import "./refine.css";
import "./saas.css";
import "./fixes.css";
import "./calendar.css";
import "../components/breaklog.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CrewOne",
  description: "CrewOne: your team, one place.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/api/pwa-icon?size=192", apple: "/api/pwa-icon?size=192" },
  appleWebApp: { capable: true, title: "CrewOne", statusBarStyle: "default" },
};
export const viewport = { themeColor: "#4f46e5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("theme");if(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t==="dark")document.documentElement.dataset.theme="dark"}catch(e){}` }} />
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("nav-layout")==="top")document.documentElement.setAttribute("data-nav","top")}catch(e){}` }} />
        <script dangerouslySetInnerHTML={{ __html: `try{var _af={inter:"Inter,ui-sans-serif,system-ui,sans-serif",system:"system-ui,-apple-system,'Segoe UI',sans-serif",serif:"Georgia,'Times New Roman',serif",mono:"'Courier New',Consolas,monospace"},_aa={indigo:["#4f46e5","#4338ca","#6366f1","#4f46e5"],blue:["#2563eb","#1d4ed8","#3b82f6","#2563eb"],violet:["#7c3aed","#6d28d9","#8b5cf6","#7c3aed"],teal:["#0d9488","#0f766e","#14b8a6","#0d9488"],rose:["#e11d48","#be123c","#fb7185","#e11d48"]},pf=localStorage.getItem("app-font"),ps=localStorage.getItem("app-size"),pa=localStorage.getItem("app-accent"),css="",fb=pf&&_af[pf]?"font-family:"+_af[pf]+";":"",sb=ps?"font-size:"+ps+"px;":"";if(fb||sb)css+="body{"+fb+sb+"}";if(pa&&_aa[pa]){var c=_aa[pa];css+=":root{--brand:"+c[0]+";--brand2:"+c[1]+'}[data-theme="dark"]{--brand:'+c[2]+";--brand2:"+c[3]+"}"}if(css){var el=document.createElement("style");el.id="u-pref";el.textContent=css;document.head.appendChild(el)}}catch(e){}` }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if("serviceWorker"in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})` }} />
      </body>
    </html>
  );
}
