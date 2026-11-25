import type { RoleResolution } from "@/services/auth/get-role";

export type AuthGateTarget = "/login" | "/dashboard" | "/holding";

/**
 * Pure routing decision. No session goes to login. A verified session with
 * exactly one known role goes to the dashboard. Every other resolution
 * stays on the holding page.
 */
export function decideAuthGate(
  hasSession: boolean,
  resolution: RoleResolution | null,
): AuthGateTarget {
  if (!hasSession) return "/login";
  if (resolution?.status === "ok") return "/dashboard";
  return "/holding";
}
