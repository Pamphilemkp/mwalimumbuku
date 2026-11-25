import type { Role, RoleResolution } from "../../services/auth/get-role.ts";
import { safeInternalPath } from "./redirect.ts";

export const APP_ROLES: readonly Role[] = ["student", "parent", "teacher", "admin"];

export type AccessDecision = "allow" | "login" | "holding";

/**
 * Fail closed. A missing session goes to login. A missing, duplicate,
 * invalid, or failed role goes to holding. A verified role outside the
 * allow-list also goes to holding.
 */
export function authorize(input: {
  hasSession: boolean;
  resolution: RoleResolution | null;
  allowedRoles: readonly Role[];
}): AccessDecision {
  if (!input.hasSession) return "login";
  if (!input.resolution || input.resolution.status !== "ok") return "holding";
  if (!input.allowedRoles.includes(input.resolution.role)) return "holding";
  return "allow";
}

/**
 * The only user id the server may use is the one from the verified session.
 * A supplied id that differs is rejected. A missing verified id is rejected.
 */
export function bindVerifiedUser(verifiedUserId: string | null, suppliedUserId: unknown): string | null {
  if (!verifiedUserId) return null;
  if (suppliedUserId == null) return verifiedUserId;
  if (typeof suppliedUserId !== "string" || suppliedUserId.length === 0) return null;
  if (suppliedUserId !== verifiedUserId) return null;
  return verifiedUserId;
}

export function destinationAfterLogin(requested: unknown): string {
  const safe = safeInternalPath(requested);
  if (safe === "/dashboard" || safe?.startsWith("/dashboard/")) return safe;
  return "/dashboard";
}

export function loginPageRedirect(input: {
  hasSession: boolean;
  resolution: RoleResolution | null;
  requested: unknown;
}): string | null {
  if (!input.hasSession) return null;
  const decision = authorize({
    hasSession: true,
    resolution: input.resolution,
    allowedRoles: APP_ROLES,
  });
  if (decision !== "allow") return "/holding";
  return destinationAfterLogin(input.requested);
}
