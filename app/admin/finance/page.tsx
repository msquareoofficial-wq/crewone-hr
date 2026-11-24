// Powered By Vistech Force
import { requireAdminPage } from "@/lib/auth";
import { getSettings, getFinUsdColors } from "@/lib/db";
import { currentMonth } from "@/lib/hr";
import { localParts } from "@/lib/time";
import { ensureMonth, listItems, okMonth, autoFillGet } from "@/lib/finance";
import Shell from "@/components/Shell";
import Breadcrumbs from "@/components/Breadcrumbs";
import FinanceClient from "./FinanceClient";

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const admin = await requireAdminPage();
  const s = await getSettings();
  const cur = currentMonth(s.timezone);
  const sp = await searchParams;
  let month = sp.month && okMonth(sp.month) ? sp.month : cur;
  if (month > cur) month = cur;
  await ensureMonth(month);
  await autoFillGet(cur, Number(localParts(new Date(), s.timezone).date.slice(8, 10)));
  const rows = await listItems(month);
  const today = month === cur ? localParts(new Date(), s.timezone).date : month + "-01";
  const usdColors = await getFinUsdColors();
  return (
    <Shell user={admin}>
      <Breadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: "Finance" }]} />
      <h1>Finance</h1>
      <FinanceClient key={month} month={month} cur={cur} today={today} initial={rows} usdC1={usdColors.c1} usdC2={usdColors.c2} />
    </Shell>
  );
}
