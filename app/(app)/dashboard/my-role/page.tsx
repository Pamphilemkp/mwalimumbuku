import { requireAccess } from "@/features/auth/require-access";
import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/ParentRolePage";

export default async function Page() {
  await requireAccess(["parent"]);
  return (
    <DashboardShell allowedRoles={["parent"]}>
      <Screen />
    </DashboardShell>
  );
}
