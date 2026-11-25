// Powered By Vistech Force
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Chat" };
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import Shell from "@/components/Shell";
import ChatClient from "./ChatClient";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const s = await getSettings();
  return (
    <Shell user={user}>
      <h1>Chat</h1>
      <ChatClient meId={user.id} meRole={user.role} tz={s.timezone} initialRoom={/^\d+$/.test(sp.room ?? "") ? Number(sp.room) : null} />
    </Shell>
  );
}
