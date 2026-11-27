// Powered By Vistech Force
import type { Metadata } from "next";
export const metadata: Metadata = { title: "User Credentials" };
import { requireAdminPage } from "@/lib/auth";
import { q } from "@/lib/db";
import Shell from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";
import CredentialsTable from "./CredentialsTable";

async function ensurePlainPassword() {
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password TEXT`);
}

export default async function CredentialsPage() {
  const admin = await requireAdminPage();
  await ensurePlainPassword();

  const users = await q<{
    id: number;
    name: string;
    emp_id: string;
    designation: string | null;
    department: string | null;
    plain_password: string | null;
    active: boolean;
  }>(
    `SELECT id, name, emp_id, designation, department, plain_password, active
     FROM users WHERE role='user' ORDER BY name ASC`
  );

  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: "Credentials" }]} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 4px" }}>User Credentials</h1>
          <p className="mute" style={{ margin: 0, fontSize: "0.83rem" }}>
            Employee IDs and login passwords. Passwords shown here are the last set password (created or reset by admin).
          </p>
        </div>
      </div>

      <div className="card">
        <CredentialsTable users={users} />
      </div>
    </Shell>
  );
}
