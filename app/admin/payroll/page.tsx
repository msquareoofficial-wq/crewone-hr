// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { q, getSettings } from "@/lib/db";
import { currentMonth } from "@/lib/hr";
import { payrollSettings } from "@/lib/payroll";
import Shell from "@/components/Shell";
import PayrollClient from "./PayrollClient";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const admin = await requireAdminPage();
  const s = await getSettings();
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth(s.timezone);
  const rows = await q<any>(
    `SELECT u.id AS user_id, u.name, u.emp_id, u.monthly_salary::float AS monthly_salary,
       p.id, p.base_salary::float, p.working_days, p.present_days, p.leave_days, p.absent_days, p.late_count,
       p.absent_deduction::float, p.late_deduction::float, p.bonus::float, p.other_deduction::float, p.net_salary::float, p.manual, p.status, p.note
     FROM users u LEFT JOIN payroll p ON p.user_id=u.id AND p.month=$1
     WHERE u.role='user' AND u.active=TRUE ORDER BY u.name`, [month]);
  const ps = await payrollSettings();
  return (
    <Shell user={admin}>
      <h1>Payroll</h1>
      <PayrollClient key={month} month={month} rows={rows} weeklyOffDays={ps.weekly_off_days} leavesPaid={ps.leaves_paid} />
    </Shell>
  );
}
