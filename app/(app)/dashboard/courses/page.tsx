import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/CourseBrowser";

export default function Page() {
  return (
    <DashboardShell>
      <Screen />
    </DashboardShell>
  );
}
