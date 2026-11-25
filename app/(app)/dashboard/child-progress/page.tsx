import { ParentAcademicRecord } from "@/features/portals/parent-record";
import { DashboardShell } from "@/src/dashboard-shell";
import Screen from "@/src/screens/dashboard/ChildProgress";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const params = await searchParams;
  return (
    <DashboardShell>
      <div className="space-y-8">
        <ParentAcademicRecord requestedChild={typeof params.child === "string" ? params.child : undefined} />
        <Screen />
      </div>
    </DashboardShell>
  );
}
