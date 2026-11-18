import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import Shell from "@/components/Shell";
import BoardClient from "./BoardClient";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ task?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const s = await getSettings();
  return (
    <Shell user={user}>
      <BoardClient projectId={Number(id) || 0} meId={user.id} meRole={user.role} tz={s.timezone} initialTask={/^\d+$/.test(sp.task ?? "") ? Number(sp.task) : null} />
    </Shell>
  );
}
