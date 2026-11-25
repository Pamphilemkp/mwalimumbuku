export const CALLBACK_SUCCESS_PATH = "/reset-password";
export const CALLBACK_FAILURE_PATH = "/reset-password?error=invalid";

export type CallbackPlan =
  | { action: "exchange-code"; code: string }
  | { action: "verify-recovery"; tokenHash: string }
  | { action: "reject" };

function isToken(value: string): boolean {
  if (value.length < 8 || value.length > 2048) return false;
  return !/[\s\u0000-\u001f\u007f]/.test(value);
}

/**
 * Recovery completion only. `next` is not read. Signup and other token
 * types are rejected. The destination is always the reset page.
 */
export function planAuthCallback(input: {
  code: unknown;
  tokenHash: unknown;
  type: unknown;
  next: unknown;
}): CallbackPlan {
  void input.next;

  if (typeof input.code === "string" && isToken(input.code)) {
    return { action: "exchange-code", code: input.code };
  }
  if (
    typeof input.tokenHash === "string" &&
    isToken(input.tokenHash) &&
    input.type === "recovery"
  ) {
    return { action: "verify-recovery", tokenHash: input.tokenHash };
  }
  return { action: "reject" };
}
