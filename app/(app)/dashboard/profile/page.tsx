import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/ProfilePage";

export default function Page() {
  return (
    <DashboardShell>
      <Screen />
    </DashboardShell>
  );
}
