import { AttendanceBoard } from "@/features/portals/attendance-board";
import { requireAccess } from "@/features/auth/require-access";
import { DashboardShell } from "@/src/dashboard-shell";

export default async function Page() {
  await requireAccess(["teacher", "parent", "student", "admin"]);
  return (
    <DashboardShell allowedRoles={["teacher", "parent", "student", "admin"]}>
      <AttendanceBoard />
    </DashboardShell>
  );
}
