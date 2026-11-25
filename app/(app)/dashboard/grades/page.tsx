import { requireAccess } from "@/features/auth/require-access";
import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/StudentGradesPage";

export default async function Page() {
  await requireAccess(["student"]);
  return (
    <DashboardShell allowedRoles={["student"]}>
      <Screen />
    </DashboardShell>
  );
}
