// Powered By Vistech Force
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Users" };
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { q } from "@/lib/db";
import Shell, { Avatar } from "@/components/Shell";
import UserForm from "@/components/UserForm";
import ResetPasswordBtn from "./ResetPasswordBtn";
import { fmt12 } from "@/lib/time";
import { onlineIds } from "@/lib/hr";
import { EmptyRow } from "@/components/EmptyState";
import Breadcrumbs from "@/components/Breadcrumbs";

export default async function UsersPage() {
  const admin = await requireAdminPage();
  const users = await q<any>("SELECT id, emp_id, name, designation, department, email, phone, shift_start, shift_end, shift_type, picture, active FROM users WHERE role='user' ORDER BY id DESC");
  const online = await onlineIds();
  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: "Users" }]} />
      <h1>Users</h1>
      <div className="card">
        <h2>Create a new user</h2>
        <UserForm />
      </div>
      <div className="card">
        <h2>All users ({users.length})</h2>
        <div className="scroll">
          <table>
            <thead><tr><th>User</th><th>ID</th><th>Dept</th><th>Email</th><th>Number</th><th>Shift</th><th>Status</th><th>Password</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><div className="row"><Avatar src={u.picture} name={u.name} online={online.has(u.id)} /><div><Link href={`/admin/users/${u.id}`}>{u.name}</Link>{u.designation && <div className="mute" style={{ fontSize: 12 }}>{u.designation}</div>}</div></div></td>
                  <td>{u.emp_id}</td><td>{u.department ?? "-"}</td><td>{u.email}</td><td>{u.phone ?? "-"}</td>
                  <td>{u.shift_type === "hybrid" ? <span className="badge b-info">Hybrid</span> : `${fmt12(u.shift_start)} - ${fmt12(u.shift_end)}`}</td>
                  <td>{u.active ? <span className="badge b-ok">Active</span> : <span className="badge b-mute">Inactive</span>}</td>
                  <td><ResetPasswordBtn id={u.id} /></td>
                </tr>
              ))}
              {!users.length && <EmptyRow icon="users" title="No employees yet" sub="Add your first employee using the form above." cols={8} />}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
