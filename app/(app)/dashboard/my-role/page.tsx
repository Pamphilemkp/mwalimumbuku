import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/ParentRolePage";

export default function Page() {
  return (
    <DashboardShell allowedRoles={["parent"]}>
      <Screen />
    </DashboardShell>
  );
}
