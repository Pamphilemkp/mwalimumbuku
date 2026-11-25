import { RoleRecords } from "@/features/dashboard/role-records";
import { SchoolAssignmentNotice } from "@/features/dashboard/school-assignment";
import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/Dashboard";

export default function Page() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <SchoolAssignmentNotice />
        <RoleRecords />
        <Screen />
      </div>
    </DashboardShell>
  );
}
