import { redirect } from "next/navigation";
import { APP_ROLES, authorize } from "@/lib/auth/access";
import { loadAppSession } from "@/services/auth/session";

export default async function HoldingPage() {
  const session = await loadAppSession();
  const decision = authorize({
    hasSession: session.hasSession,
    resolution: session.resolution,
    allowedRoles: APP_ROLES,
  });
  if (decision !== "holding") {
    redirect(decision === "login" ? "/login" : "/dashboard");
  }

  return null;
}
