import { redirect } from "next/navigation";
import { decideAuthGate } from "@/services/auth/auth-gate";
import { loadAppSession } from "@/services/auth/session";

export default async function HomePage() {
  const session = await loadAppSession();
  redirect(decideAuthGate(session.hasSession, session.resolution));
}
