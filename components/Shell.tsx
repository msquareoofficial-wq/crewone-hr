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
import { getNavLabels } from "@/lib/db";

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
  const labels = await getNavLabels();
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
              <LiveNavLink tab="admindash" href="/admin" label={labels.admindash} exact />
              <LiveNavLink tab="users" href="/admin/users" label={labels.users} />
              <LiveNavLink tab="notifications" href="/admin/notifications" label={labels.notifications} />
              <LiveNavLink tab="leaves" href="/admin/leaves" label={labels.leaves} />
              <LiveNavLink tab="calendar" href="/calendar" label={labels.calendar} />
              <ProjectsNavLink />
              <ChatNavLink />
              <NavMore items={[
                { href: "/admin/corrections", label: labels.corrections },
                { href: "/admin/reports", label: labels.reports },
                { href: "/admin/performance", label: labels.performance },
                { href: "/admin/payroll", label: labels.payroll },
                { href: "/admin/finance", label: labels.finance },
                { href: "/admin/activity", label: labels.activity },
              ]} />
              <LiveNavLink tab="settings" href="/admin/settings" label={labels.settings} icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:"middle",flexShrink:0}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>} />
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
