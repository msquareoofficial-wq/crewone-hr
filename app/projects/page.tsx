// Powered By Vistech Force
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Projects" };
import { requireUser } from "@/lib/auth";
import Shell from "@/components/Shell";
import ProjectsClient from "./ProjectsClient";

export default async function ProjectsPage() {
  const user = await requireUser();
  return (
    <Shell user={user}>
      <h1>Projects</h1>
      <ProjectsClient isAdmin={user.role === "admin"} />
    </Shell>
  );
}
