import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { loadAppSession } from "@/services/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await loadAppSession();
  if (!session.hasSession) redirect("/login");
  return children;
}
