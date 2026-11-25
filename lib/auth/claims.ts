export function sessionFromClaims(error: unknown, sub: unknown): { hasUser: boolean } {
  if (error != null) return { hasUser: false };
  if (typeof sub !== "string" || sub.length === 0) return { hasUser: false };
  return { hasUser: true };
}

export function readIdentity(claims: unknown): {
  userId: string;
  email: string | null;
  name: string | null;
} | null {
  if (!claims || typeof claims !== "object") return null;
  const record = claims as Record<string, unknown>;
  if (typeof record.sub !== "string" || record.sub.length === 0) return null;

  const email = typeof record.email === "string" && record.email.length > 0 ? record.email : null;
  let name: string | null = null;
  const metadata = record.user_metadata;
  if (metadata && typeof metadata === "object") {
    const fullName = (metadata as Record<string, unknown>).full_name;
    if (typeof fullName === "string" && fullName.trim().length > 0) {
      name = fullName.trim();
    }
  }

  return { userId: record.sub, email, name };
}
