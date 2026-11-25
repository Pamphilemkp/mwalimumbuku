import { AUTH_LIMITS } from "../../lib/auth/limits.ts";
import type { RateLimiter } from "../../lib/auth/rate-limit.ts";
import { parseEmail } from "../../lib/auth/validation.ts";
import type { AuthFailure } from "./sign-in.ts";

export type RecoveryResult =
  | { status: "accepted"; message: string }
  | { status: "failed"; message: string };

const ACCEPTED =
  "If an account exists for that email, a reset link is on its way. It expires soon and can only be used on this site.";
const INVALID_EMAIL = "Enter the email address for your account.";
const UNAVAILABLE = "Password recovery is unavailable right now. Try again in a few minutes.";
const LIMITED = "Too many attempts. Wait a few minutes and try again.";

function isUnreachable(error: AuthFailure): boolean {
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

export async function runRequestPasswordReset(
  deps: {
    consume: RateLimiter;
    resetPasswordForEmail: (email: string, redirectTo: string) => Promise<{ error: AuthFailure | null }>;
  },
  input: { email: unknown; address: string },
  origin: string | null,
): Promise<RecoveryResult> {
  const email = parseEmail(input.email);
  if (!email) return { status: "failed", message: INVALID_EMAIL };
  if (!origin) return { status: "failed", message: UNAVAILABLE };

  const decision = deps.consume(`recover:${input.address}`, AUTH_LIMITS.recover.limit, AUTH_LIMITS.recover.windowMs);
  if (!decision.allowed) return { status: "failed", message: LIMITED };

  const redirectTo = `${origin}/auth/callback`;
  try {
    const { error } = await deps.resetPasswordForEmail(email, redirectTo);
    if (error && isUnreachable(error)) return { status: "failed", message: UNAVAILABLE };
  } catch {
    return { status: "failed", message: UNAVAILABLE };
  }

  return { status: "accepted", message: ACCEPTED };
}
