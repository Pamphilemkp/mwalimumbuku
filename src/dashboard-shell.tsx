"use client";

import type { ReactNode } from "react";
import DashboardLayout from "@/src/components/DashboardLayout";
import OnboardingGuard from "@/src/components/OnboardingGuard";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import type { AppRole } from "@/src/lib/auth";

export function DashboardShell({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: AppRole[];
}) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <OnboardingGuard>
        <DashboardLayout>{children}</DashboardLayout>
      </OnboardingGuard>
    </ProtectedRoute>
  );
}
