import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/StudentGradesPage";

export default function Page() {
  return (
    <DashboardShell allowedRoles={["student"]}>
      <Screen />
    </DashboardShell>
  );
}
