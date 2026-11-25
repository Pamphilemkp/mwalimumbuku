import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/TeacherStudentsPage";

export default function Page() {
  return (
    <DashboardShell allowedRoles={["teacher", "admin"]}>
      <Screen />
    </DashboardShell>
  );
}
