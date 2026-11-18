// Powered By Vistech Force
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const u = await getSession();
  if (!u) redirect("/login");
  redirect(u.role === "admin" ? "/admin" : "/dashboard");
}
