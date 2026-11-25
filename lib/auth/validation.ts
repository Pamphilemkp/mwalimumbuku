const EMAIL_MAX = 254;
const PASSWORD_MAX = 72;
const NEW_PASSWORD_MIN = 8;

function hasControlChar(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value);
}

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (hasControlChar(value)) return null;
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX) return null;
  if (/\s/.test(email)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** Existing accounts may have a short password. Only reject empty and oversized values. */
export function parsePasswordForSignIn(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > PASSWORD_MAX) return null;
  if (hasControlChar(value)) return null;
  return value;
}

export function parseNewPassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < NEW_PASSWORD_MIN || value.length > PASSWORD_MAX) return null;
  if (hasControlChar(value)) return null;
  return value;
}

export const NEW_PASSWORD_RULE = "Use a password between 8 and 72 characters.";
