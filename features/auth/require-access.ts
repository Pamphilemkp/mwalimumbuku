import "server-only";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/auth/access";
import { loadAppSession } from "@/services/auth/session";
import type { Role } from "@/services/auth/get-role";

export async function requireAccess(allowedRoles: readonly Role[]) {
  const session = await loadAppSession();
  const decision = authorize({
    hasSession: session.hasSession,
    resolution: session.resolution,
    allowedRoles,
  });
  if (decision === "login") redirect("/login");
  if (decision === "holding") redirect("/holding");
  return session;
}
