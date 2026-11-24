import { redirect } from "next/navigation";
import type { Role } from "@/services/auth/get-role";
import { decideAuthGate } from "@/services/auth/auth-gate";
import { loadAppSession } from "@/services/auth/session";

const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  parent: "Parent",
  teacher: "Teacher",
  admin: "Admin",
};

export default async function DashboardPage() {
  const session = await loadAppSession();
  const target = decideAuthGate(session.hasSession, session.resolution);
  if (target !== "/dashboard" || session.resolution?.status !== "ok") {
    redirect(target);
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
