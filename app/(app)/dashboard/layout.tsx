import type { ReactNode } from "react";
import { requireAccess } from "@/features/auth/require-access";
import { APP_ROLES } from "@/lib/auth/access";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAccess(APP_ROLES);
  return children;
}
