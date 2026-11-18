// Powered By Vistech Force
import Link from "next/link";
import { can, type SessionUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import Footer from "./Footer";
import { ChatNavLink, ChatWidget } from "./ChatLive";
import ThemeToggle from "./ThemeToggle";
import ClockWeather from "./ClockWeather";
import NavMore from "./NavMore";
import DailyPopup from "./DailyPopup";
import PushToggle from "./PushToggle";
import NavActive from "./NavActive";
import MyProfile from "./MyProfile";
import ProjectsNavLink from "./ProjectsNav";
import { LiveNavLink, LiveToasts, NotifBell } from "./LiveTabs";
import { BRAND, getBrandLogos } from "@/lib/brand";

// online: true = green dot (active), false = red dot (inactive), undefined = no dot
export function Avatar({ src, name, size = 34, online }: { src?: string | null; name: string; size?: number; online?: boolean }) {
  const style = { width: size, height: size };
  // eslint-disable-next-line @next/next/no-img-element
  const inner = src ? <img className="avatar" style={style} src={src} alt={name} /> : <span className="avatar" style={style}>{name.slice(0, 1).toUpperCase()}</span>;
  if (online === undefined) return inner;
  return <span className="av-wrap" style={style}>{inner}<i className={`dot ${online ? "on" : "off"}`} title={online ? "Active" : "Inactive"} /></span>;
}

export default async function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const admin = user.role === "admin";
  const logos = await getBrandLogos();
  return (
    <>
      <header className="top">
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lg-d" src={logos.dark} alt={BRAND.name} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lg-l" src={logos.light} alt={BRAND.name} />
        </div>
        <nav>
          {admin ? (
            <>
              <LiveNavLink tab="admindash" href="/admin" label="Dashboard" exact />
              <LiveNavLink tab="users" href="/admin/users" label="Users" />
              <LiveNavLink tab="notifications" href="/admin/notifications" label="Notifications" />
              <LiveNavLink tab="leaves" href="/admin/leaves" label="Leaves" />
              <LiveNavLink tab="calendar" href="/calendar" label="Calendar" />
              <ProjectsNavLink />
              <ChatNavLink />
              <NavMore items={[
                { href: "/admin/corrections", label: "Corrections" },
                { href: "/admin/reports", label: "Reports" },
                { href: "/admin/performance", label: "Performance" },
                { href: "/admin/payroll", label: "Payroll" },
                { href: "/admin/finance", label: "Finance" },
                { href: "/admin/activity", label: "Activity" },
                { href: "/admin/settings", label: "Settings" },
              ]} />
            </>
          ) : (
            <>
              <LiveNavLink tab="dashboard" href="/dashboard" label="My Dashboard" />
              {can(user, "dashboard") && <LiveNavLink tab="admindash" href="/admin" label="Team Dashboard" exact />}
              {can(user, "leaves") && <LiveNavLink tab="leaves" href="/admin/leaves" label="Leaves" />}
              {can(user, "notifications") && <LiveNavLink tab="notifications" href="/admin/notifications" label="Notices" />}
              {can(user, "reports") && <Link href="/admin/reports">Reports</Link>}
              {can(user, "reports") && <Link href="/admin/performance">Performance</Link>}
              <LiveNavLink tab="calendar" href="/calendar" label="Calendar" />
              <ProjectsNavLink />
              <ChatNavLink />
            </>
          )}
        </nav>
        <NavActive />
        <div className="who">
          <MyProfile name={user.name} picture={user.picture} status={user.status_text} />
          <span className="who-t">{user.name} ({user.emp_id}){(user.designation || user.status_text) && <small>{[user.designation, user.status_text].filter(Boolean).join(" " + String.fromCharCode(183) + " ")}</small>}</span>
          <ClockWeather />
          <NotifBell />
          <PushToggle />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="wrap">{children}</main>
      <Footer />
      <ChatWidget />
      <LiveToasts />
      <DailyPopup userId={user.id} />
    </>
  );
}
