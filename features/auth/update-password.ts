import { AUTH_LIMITS } from "../../lib/auth/limits.ts";
import type { RateLimiter } from "../../lib/auth/rate-limit.ts";
import { NEW_PASSWORD_RULE, parseNewPassword } from "../../lib/auth/validation.ts";
import type { AuthFailure } from "./sign-in.ts";

export type PasswordUpdateResult =
  | { status: "updated" }
  | { status: "failed"; message: string };

const MISMATCH = "Those passwords do not match.";
const INVALID_LINK = "This reset link is invalid or has expired. Request a new one.";
const UNAVAILABLE = "The password could not be changed right now. Try again in a few minutes.";
const LIMITED = "Too many attempts. Wait a few minutes and try again.";

function isUnreachable(error: AuthFailure): boolean {
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

export async function runUpdatePassword(
  deps: {
    consume: RateLimiter;
    updatePassword: (password: string) => Promise<{ error: AuthFailure | null }>;
    signOut: () => Promise<{ error: AuthFailure | null }>;
  },
  input: {
    password: unknown;
    confirm: unknown;
    address: string;
    hasSession: boolean;
  },
): Promise<PasswordUpdateResult> {
  if (!input.hasSession) return { status: "failed", message: INVALID_LINK };

  const password = parseNewPassword(input.password);
  if (!password) return { status: "failed", message: NEW_PASSWORD_RULE };
  if (typeof input.confirm !== "string" || input.confirm !== password) {
    return { status: "failed", message: MISMATCH };
  }

  const decision = deps.consume(
    `update-password:${input.address}`,
    AUTH_LIMITS.updatePassword.limit,
    AUTH_LIMITS.updatePassword.windowMs,
  );
  if (!decision.allowed) return { status: "failed", message: LIMITED };

  try {
    const { error } = await deps.updatePassword(password);
    if (error) {
      return { status: "failed", message: isUnreachable(error) ? UNAVAILABLE : NEW_PASSWORD_RULE };
    }
    await deps.signOut();
  } catch {
    return { status: "failed", message: UNAVAILABLE };
  }

  return { status: "updated" };
}
