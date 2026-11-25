export type SignOutError = {
  name?: string;
  status?: number;
};

export type SignOutOutcome =
  | { status: "signed-out" }
  | { status: "failed"; message: string };

const UNREACHABLE = "We could not reach the sign-out service. Try again in a few minutes.";
const INCOMPLETE = "Sign-out did not complete. Try again.";
const UNAVAILABLE = "Sign-out is unavailable right now. Try again in a few minutes.";

export function messageForSignOutError(error: SignOutError): string {
  const unreachable = error.name === "AuthRetryableFetchError" || error.status === 0;
  return unreachable ? UNREACHABLE : INCOMPLETE;
}

/**
 * Runs the default global sign-out. A returned or thrown error means the
 * cookie session is still in place, so the caller must not navigate away.
 */
export async function runSignOut(
  signOut: () => Promise<{ error: SignOutError | null }>,
): Promise<SignOutOutcome> {
  try {
    const { error } = await signOut();
    if (error) {
      return { status: "failed", message: messageForSignOutError(error) };
    }
    return { status: "signed-out" };
  } catch {
    return { status: "failed", message: UNAVAILABLE };
  }
}
