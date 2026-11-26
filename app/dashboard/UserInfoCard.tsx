// Powered By Vistech Force
import { fmt12 } from "@/lib/time";

type UserDetail = {
  name: string;
  emp_id: string;
  pseudo_name: string | null;
  designation: string | null;
  department: string | null;
  email: string | null;
  office_email: string | null;
  phone: string | null;
  office_phone: string | null;
  cnic: string | null;
  joining_date: string | null;
  shift_start: string;
  shift_end: string;
  shift_type: string;
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: "1px solid var(--line)", alignItems: "flex-start" }}>
      <span style={{ minWidth: 160, fontSize: "0.82rem", color: "var(--mute)", fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "0.9rem", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

export default function UserInfoCard({ u }: { u: UserDetail }) {
  const shift = u.shift_type === "hybrid"
    ? `Hybrid (${fmt12(u.shift_start)} – ${fmt12(u.shift_end)})`
    : `${fmt12(u.shift_start)} – ${fmt12(u.shift_end)}`;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>My Information</h2>
        <span className="badge b-mute" style={{ fontSize: "0.75rem" }}>View only</span>
      </div>
      <div>
        <Row label="Full name" value={u.name} />
        <Row label="Employee ID" value={u.emp_id} />
        <Row label="Designation" value={u.designation} />
        <Row label="Department" value={u.department} />
        <Row label="Pseudo name" value={u.pseudo_name} />
        <Row label="Email" value={u.email} />
        <Row label="Office email" value={u.office_email} />
        <Row label="Mobile" value={u.phone} />
        <Row label="Office phone" value={u.office_phone} />
        <Row label="CNIC" value={u.cnic} />
        <Row label="Date of joining" value={u.joining_date ?? undefined} />
        <Row label="Shift" value={shift} />
      </div>
      <p className="mute" style={{ margin: "12px 0 0", fontSize: "0.78rem" }}>
        To update your information, please contact your administrator.
      </p>
    </div>
  );
}
