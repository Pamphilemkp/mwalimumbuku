import { redirect } from "next/navigation";
import { decideAuthGate } from "@/services/auth/auth-gate";
import { loadAppSession } from "@/services/auth/session";

export default async function HoldingPage() {
  const session = await loadAppSession();
  const target = decideAuthGate(session.hasSession, session.resolution);
  if (target !== "/holding") {
    redirect(target);
  }

  return null;
}
