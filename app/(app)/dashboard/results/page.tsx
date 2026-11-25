import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/TeacherResults";

export default function Page() {
  return (
    <DashboardShell allowedRoles={["teacher", "admin"]}>
      <Screen />
    </DashboardShell>
  );
}
