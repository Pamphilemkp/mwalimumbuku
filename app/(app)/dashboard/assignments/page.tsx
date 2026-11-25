import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/StudentAssignmentsPage";

export default function Page() {
  return (
    <DashboardShell allowedRoles={["student"]}>
      <Screen />
    </DashboardShell>
  );
}
