import { requireAccess } from "@/features/auth/require-access";
import { TeacherClasses } from "@/features/portals/teacher-classes";
import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/TeacherStudentsPage";

export default async function Page() {
  await requireAccess(["teacher", "admin"]);
  return (
    <DashboardShell allowedRoles={["teacher", "admin"]}>
      <div className="space-y-6">
        <TeacherClasses />
        <Screen />
      </div>
    </DashboardShell>
  );
}
