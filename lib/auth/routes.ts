import { safeInternalPath } from "./redirect.ts";

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/holding" ||
    pathname.startsWith("/holding/")
  );
}

export function anonymousMustSignIn(pathname: string): boolean {
  return isProtectedPath(pathname);
}

export function loginNextPath(pathname: string): string | null {
  if (!isProtectedPath(pathname)) return null;
  const safe = safeInternalPath(pathname);
  if (safe !== pathname) return null;
  if (safe === "/holding" || safe.startsWith("/holding/")) return "/holding";
  if (safe === "/dashboard" || safe.startsWith("/dashboard/")) return safe;
  return null;
}
