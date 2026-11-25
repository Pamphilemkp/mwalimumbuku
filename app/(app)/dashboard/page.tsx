import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/Dashboard";

export default function Page() {
  return (
    <DashboardShell>
      <Screen />
    </DashboardShell>
  );
}
