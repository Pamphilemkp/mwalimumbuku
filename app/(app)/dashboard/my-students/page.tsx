import { requireAccess } from "@/features/auth/require-access";
import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/TeacherStudentsPage";

export default async function Page() {
  await requireAccess(["teacher", "admin"]);
  return (
    <DashboardShell allowedRoles={["teacher", "admin"]}>
      <Screen />
    </DashboardShell>
  );
}
