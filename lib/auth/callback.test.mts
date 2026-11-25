import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CALLBACK_FAILURE_PATH, CALLBACK_SUCCESS_PATH, planAuthCallback } from "./callback.ts";

const CODE = "pkce-code-value";
const HASH = "recovery-token-hash";

describe("planAuthCallback", () => {
  it("exchanges a code and ignores an external next", () => {
    const plan = planAuthCallback({
      code: CODE,
      tokenHash: null,
      type: null,
      next: "https://evil.example",
    });
    assert.deepEqual(plan, { action: "exchange-code", code: CODE });
    assert.equal(CALLBACK_SUCCESS_PATH, "/reset-password");
    assert.equal(CALLBACK_FAILURE_PATH.includes("token"), false);
    assert.equal(CALLBACK_FAILURE_PATH.includes("evil"), false);
  });

  it("accepts a recovery token hash", () => {
    assert.deepEqual(
      planAuthCallback({ code: null, tokenHash: HASH, type: "recovery", next: "/dashboard" }),
      { action: "verify-recovery", tokenHash: HASH },
    );
  });

  it("rejects missing, expired-shaped, and non-recovery tokens", () => {
    assert.equal(planAuthCallback({ code: null, tokenHash: null, type: null, next: null }).action, "reject");
    assert.equal(planAuthCallback({ code: "short", tokenHash: null, type: null, next: null }).action, "reject");
    assert.equal(
      planAuthCallback({ code: null, tokenHash: HASH, type: "signup", next: null }).action,
      "reject",
    );
    assert.equal(
      planAuthCallback({ code: null, tokenHash: HASH, type: "magiclink", next: null }).action,
      "reject",
    );
    assert.equal(
      planAuthCallback({ code: "bad token", tokenHash: null, type: "recovery", next: null }).action,
      "reject",
    );
  });
});
