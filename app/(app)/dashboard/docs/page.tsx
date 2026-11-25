import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/DocsPage";

export default function Page() {
  return (
    <DashboardShell>
      <Screen />
    </DashboardShell>
  );
}
