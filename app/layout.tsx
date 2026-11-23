// Powered By Vistech Force
import "./globals.css";
import "./chat.css";
import "./dark.css";
import "./extras.css";
import "./polish.css";
import "./refine.css";
import "./saas.css";
import "./fixes.css";
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
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if("serviceWorker"in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})` }} />
      </body>
    </html>
  );
}
