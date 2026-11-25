import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/AdminAnalytics";

export default function Page() {
  return (
    <DashboardShell allowedRoles={["admin"]}>
      <Screen />
    </DashboardShell>
  );
}
