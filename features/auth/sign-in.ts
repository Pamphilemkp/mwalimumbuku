import { AUTH_LIMITS } from "../../lib/auth/limits.ts";
import type { RateLimiter } from "../../lib/auth/rate-limit.ts";
import { destinationAfterLogin } from "../../lib/auth/access.ts";
import { parseEmail, parsePasswordForSignIn } from "../../lib/auth/validation.ts";

export type AuthFailure = { name?: string; status?: number };

export type SignInResult =
  | { status: "signed-in"; redirectTo: string }
  | { status: "failed"; message: string };

const MISSING = "Enter both an email and a password.";
const REJECTED = "Those details were not accepted. Check the email and password and try again.";
const UNREACHABLE = "We could not reach the sign-in service. Try again in a few minutes.";
const UNAVAILABLE = "Sign-in is unavailable right now. Try again in a few minutes.";
const LIMITED = "Too many attempts. Wait a few minutes and try again.";

function isUnreachable(error: AuthFailure): boolean {
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

export async function runSignIn(
  deps: {
    consume: RateLimiter;
    signInWithPassword: (email: string, password: string) => Promise<{ error: AuthFailure | null }>;
  },
  input: {
    email: unknown;
    password: unknown;
    next: unknown;
    address: string;
  },
): Promise<SignInResult> {
  const email = parseEmail(input.email);
  const password = parsePasswordForSignIn(input.password);
  if (!email || !password) return { status: "failed", message: MISSING };

  const decision = deps.consume(`sign-in:${input.address}`, AUTH_LIMITS.signIn.limit, AUTH_LIMITS.signIn.windowMs);
  if (!decision.allowed) return { status: "failed", message: LIMITED };

  try {
    const { error } = await deps.signInWithPassword(email, password);
    if (error) {
      return { status: "failed", message: isUnreachable(error) ? UNREACHABLE : REJECTED };
    }
  } catch {
    return { status: "failed", message: UNAVAILABLE };
  }

  return { status: "signed-in", redirectTo: destinationAfterLogin(input.next) };
}
