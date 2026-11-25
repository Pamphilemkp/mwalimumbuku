import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/MoodPage";

export default function Page() {
  return (
    <DashboardShell>
      <Screen />
    </DashboardShell>
  );
}
