import { redirect } from "next/navigation";
import type { Role } from "@/services/auth/get-role";
import { APP_ROLES, authorize } from "@/lib/auth/access";
import { loadAppSession } from "@/services/auth/session";

const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  parent: "Parent",
  teacher: "Teacher",
  admin: "Admin",
};

export default async function DashboardPage() {
  const session = await loadAppSession();
  const decision = authorize({
    hasSession: session.hasSession,
    resolution: session.resolution,
    allowedRoles: APP_ROLES,
  });
  if (decision !== "allow" || session.resolution?.status !== "ok") {
    redirect(decision === "login" ? "/login" : "/holding");
  }

  const role = session.resolution.role;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">You are signed in</h1>
      <dl className="mt-6 space-y-3 text-base">
        <div>
          <dt className="text-sm text-muted-foreground">Role</dt>
          <dd className="font-medium">{ROLE_LABEL[role]}</dd>
        </div>
        {session.name ? (
          <div>
            <dt className="text-sm text-muted-foreground">Name</dt>
            <dd>{session.name}</dd>
          </div>
        ) : null}
        {session.email ? (
          <div>
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="break-all">{session.email}</dd>
          </div>
        ) : null}
      </dl>
    </main>
  );
}
