import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/CourseEditor";

export default function Page() {
  return (
    <DashboardShell allowedRoles={["teacher", "admin"]}>
      <Screen />
    </DashboardShell>
  );
}
