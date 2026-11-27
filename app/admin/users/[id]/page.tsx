import { notFound } from "next/navigation";
import TaskLog from "@/components/TaskLog";
import BreakLog from "@/components/BreakLog";
import { getBreakLog } from "@/lib/breaklog";
import { getTaskLog } from "@/lib/tasklog";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { q, q1, getSettings } from "@/lib/db";
import { currentMonth, monthSummary, onlineIds, todayDate } from "@/lib/hr";
import Shell, { Avatar } from "@/components/Shell";
import UserForm from "@/components/UserForm";
import MonthTable, { MonthStats, MonthPicker } from "@/components/MonthTable";
import UserActions from "./UserActions";
import Breadcrumbs from "@/components/Breadcrumbs";

export default async function UserDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9]+$/.test(id)) notFound();
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT");
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT");
  const u = await q1<any>("SELECT * FROM users WHERE id=$1 AND role='user'", [id]);
  if (!u) notFound();
  const s = await getSettings();
  const sp = await searchParams;
  const month = sp.month && /^[0-9]{4}-[0-9]{2}$/.test(sp.month) ? sp.month : currentMonth(s.timezone);
  const sum = await monthSummary(u.id, month);
  const online = (await onlineIds()).has(u.id);
  const todayAtt = await q1<any>("SELECT sign_out FROM attendance WHERE user_id=$1 AND work_date=$2", [u.id, await todayDate()]);
  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { href: "/admin/users", label: "Users" }, { label: u.name }]} />
      <div className="row" style={{ marginBottom: 16 }}>
        <Avatar src={u.picture} name={u.name} size={56} online={online} />
        <div><h1 style={{ margin: 0 }}>{u.name}</h1><span className="mute">{u.designation ? u.designation + " | " : ""}{u.emp_id} | {u.department ?? "No dept"} | {u.active ? "Active" : "Inactive"}</span></div>
        <div className="spacer" />
        <UserActions id={u.id} active={u.active} outToday={!!todayAtt?.sign_out} />
      </div>
      <MonthStats s={sum} />
      <div className="card">
        <div className="row"><h2 style={{ margin: 0 }}>Monthly record</h2><div className="spacer" /><a className="btn sec sm" href={`/api/reports?month=${month}&userId=${u.id}`}>Download CSV</a></div>
        <MonthPicker month={month} />
        <MonthTable rows={sum.rows} tz={s.timezone} />
      </div>
      <BreakLog rows={await getBreakLog(u.id, month)} tz={s.timezone} csvHref={`/api/breaklog?month=${month}&userId=${u.id}`} title={`Break log (${month})`} />
      <TaskLog rows={await getTaskLog(u.id, month)} tz={s.timezone} csvHref={`/api/tasklog?month=${month}&userId=${u.id}`} title={`Task log (${month})`} />
      <div className="card"><h2>User details</h2><UserForm id={u.id} initial={u} initialLocked={true} /></div>
    </Shell>
  );
}
