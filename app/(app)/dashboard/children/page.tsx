import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/ChildrenPage";

export default function Page() {
  return (
    <DashboardShell>
      <Screen />
    </DashboardShell>
  );
}
