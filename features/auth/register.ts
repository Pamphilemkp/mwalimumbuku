import { AUTH_LIMITS } from "../../lib/auth/limits.ts";
import type { RateLimiter } from "../../lib/auth/rate-limit.ts";
import { parseEmail, parseNewPassword } from "../../lib/auth/validation.ts";
import type { AuthFailure } from "./sign-in.ts";

export type PublicRole = "student" | "parent";

export type RegisterResult =
  | { status: "accepted"; message: string }
  | { status: "failed"; code: "invalid" | "limited" | "unavailable"; message: string };

const ACCEPTED =
  "If this address can be registered, a confirmation message is on its way. You can use the same form again if it does not arrive.";
const INVALID = "Check the name, email, and password and try again.";
const LIMITED = "Too many attempts. Wait a few minutes and try again.";
const UNAVAILABLE = "Registration is unavailable right now. Try again in a few minutes.";

function hasControlChar(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value);
}

export function parsePublicRole(value: unknown): PublicRole | null {
  if (value === "student" || value === "parent") return value;
  return null;
}

export function parsePersonName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (hasControlChar(value)) return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  return name;
}

export function parseShortText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  if (hasControlChar(value)) return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length === 0 || text.length > max) return null;
  return text;
}

function isOutage(error: AuthFailure): boolean {
  return error.name === "AuthRetryableFetchError" || error.status === 0 || (error.status ?? 0) >= 500;
}

export async function runRegister(
  deps: {
    consume: RateLimiter;
    signUp: (input: {
      email: string;
      password: string;
      fullName: string;
      role: PublicRole;
      redirectTo: string;
    }) => Promise<{ error: AuthFailure | null }>;
  },
  input: {
    role: unknown;
    email: unknown;
    password: unknown;
    fullName: unknown;
    address: string;
    redirectTo: string;
  },
): Promise<RegisterResult> {
  const role = parsePublicRole(input.role);
  const email = parseEmail(input.email);
  const password = parseNewPassword(input.password);
  const fullName = parsePersonName(input.fullName);
  if (!role || !email || !password || !fullName) return { status: "failed", code: "invalid", message: INVALID };
  if (!input.redirectTo.startsWith("https://") && !input.redirectTo.startsWith("http://localhost") && !input.redirectTo.startsWith("http://127.0.0.1")) {
    return { status: "failed", code: "unavailable", message: UNAVAILABLE };
  }

  const decision = deps.consume(`register:${input.address}`, AUTH_LIMITS.register.limit, AUTH_LIMITS.register.windowMs);
  if (!decision.allowed) return { status: "failed", code: "limited", message: LIMITED };

  try {
    const { error } = await deps.signUp({ email, password, fullName, role, redirectTo: input.redirectTo });
    if (error && isOutage(error)) return { status: "failed", code: "unavailable", message: UNAVAILABLE };
  } catch {
    return { status: "failed", code: "unavailable", message: UNAVAILABLE };
  }

  return { status: "accepted", message: ACCEPTED };
}
