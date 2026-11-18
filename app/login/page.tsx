// Powered By Vistech Force
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { BRAND, getBrandLogos } from "@/lib/brand";

export default async function LoginPage() {
  const u = await getSession();
  const logos = await getBrandLogos();
  if (u) redirect(u.role === "admin" ? "/admin" : "/dashboard");
  return (
    <div className="lgx">
      <aside className="lgx-l">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logos.light} alt={BRAND.name} />
        <div>
          <h2>Your team, one place.</h2>
          <p>Attendance, tasks, leave, chat and projects in one calm workspace.</p>
        </div>
        <small>CrewOne</small>
      </aside>
    <div className="login">
      <div className="login-theme"><ThemeToggle /></div>
      <div className="card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-logo" src={logos.dark} alt={BRAND.name} />
        <h1 style={{ textAlign: "center", marginBottom: 2 }}>CrewOne</h1>
        <p className="mute" style={{ textAlign: "center", marginTop: 0 }}>Your team, one place.</p>
        <p className="mute">After signing in, click IN on your dashboard to mark your attendance.</p>
        <LoginForm />
      </div>
      <Footer />
    </div>
    </div>
  );
}
