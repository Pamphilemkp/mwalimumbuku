import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { HoldingView } from "@/features/auth/holding-view";
import { LogoutButton } from "@/features/auth/logout-button";
import { APP_ROLES, authorize } from "@/lib/auth/access";
import { loadAppSession } from "@/services/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await loadAppSession();
  const decision = authorize({
    hasSession: session.hasSession,
    resolution: session.resolution,
    allowedRoles: APP_ROLES,
  });

  if (decision === "login") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-4">
          <p className="text-base font-semibold">Mwalimu Mbuku</p>
          <LogoutButton />
        </div>
      </header>
      {decision === "holding" ? <HoldingView resolution={session.resolution} /> : children}
    </div>
  );
}
