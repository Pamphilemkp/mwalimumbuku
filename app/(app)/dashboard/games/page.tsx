import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/GamesPage";

export default function Page() {
  return (
    <DashboardShell>
      <Screen />
    </DashboardShell>
  );
}
