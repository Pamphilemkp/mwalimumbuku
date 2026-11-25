import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runRequestPasswordReset } from "./request-password-reset.ts";

describe("runRequestPasswordReset", () => {
  it("uses the server origin and the same response when the account is unknown", async () => {
    const calls: Array<{ email: string; redirectTo: string }> = [];
    const result = await runRequestPasswordReset(
      {
        consume: () => ({ allowed: true }),
        resetPasswordForEmail: async (email, redirectTo) => {
          calls.push({ email, redirectTo });
          return { error: { name: "AuthApiError", status: 400 } };
        },
      },
      { email: "missing@example.com", address: "203.0.113.20" },
      "https://staging.example",
    );
    assert.deepEqual(calls, [
      { email: "missing@example.com", redirectTo: "https://staging.example/auth/callback" },
    ]);
    assert.equal(result.status, "accepted");
    if (result.status === "accepted") {
      assert.equal(result.message.includes("missing@example.com"), false);
      assert.equal(result.message.toLowerCase().includes("not found"), false);
    }
  });

  it("does not call the provider for an invalid email or a missing origin", async () => {
    let calls = 0;
    const deps = {
      consume: () => ({ allowed: true as const }),
      resetPasswordForEmail: async () => {
        calls += 1;
        return { error: null };
      },
    };
    const invalid = await runRequestPasswordReset(deps, { email: "not-an-email", address: "1.1.1.1" }, "https://staging.example");
    const noOrigin = await runRequestPasswordReset(deps, { email: "a@example.com", address: "1.1.1.1" }, null);
    assert.equal(invalid.status, "failed");
    assert.equal(noOrigin.status, "failed");
    assert.equal(calls, 0);
  });

  it("blocks recovery after the limit", async () => {
    let calls = 0;
    const result = await runRequestPasswordReset(
      {
        consume: () => ({ allowed: false }),
        resetPasswordForEmail: async () => {
          calls += 1;
          return { error: null };
        },
      },
      { email: "a@example.com", address: "203.0.113.21" },
      "https://staging.example",
    );
    assert.equal(result.status, "failed");
    assert.equal(calls, 0);
  });
});
