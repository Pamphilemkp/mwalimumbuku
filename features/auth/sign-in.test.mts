import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../../lib/auth/rate-limit.ts";
import { AUTH_LIMITS } from "../../lib/auth/limits.ts";
import { runSignIn } from "./sign-in.ts";

describe("runSignIn", () => {
  it("does not call the provider when the limit is already spent", async () => {
    const consume = createRateLimiter(() => 1_000);
    for (let i = 0; i < AUTH_LIMITS.signIn.limit; i += 1) {
      consume("sign-in:203.0.113.8", AUTH_LIMITS.signIn.limit, AUTH_LIMITS.signIn.windowMs);
    }
    let calls = 0;
    const result = await runSignIn(
      {
        consume,
        signInWithPassword: async () => {
          calls += 1;
          return { error: null };
        },
      },
      { email: "a@example.com", password: "secret-pass", next: "/dashboard", address: "203.0.113.8" },
    );
    assert.equal(result.status, "failed");
    assert.equal(calls, 0);
    if (result.status === "failed") assert.equal(result.message.includes("secret-pass"), false);
  });

  it("returns a generic failure and drops an external redirect", async () => {
    const seen: Array<{ email: string; password: string }> = [];
    const result = await runSignIn(
      {
        consume: () => ({ allowed: true }),
        signInWithPassword: async (email, password) => {
          seen.push({ email, password });
          return { error: { name: "AuthApiError", status: 400, message: "Invalid login credentials" } as { name: string; status: number } };
        },
      },
      {
        email: "a@example.com",
        password: "secret-pass",
        next: "https://evil.example",
        address: "203.0.113.9",
      },
    );
    assert.equal(seen.length, 1);
    assert.deepEqual(seen[0], { email: "a@example.com", password: "secret-pass" });
    assert.equal(result.status, "failed");
    if (result.status === "failed") {
      assert.equal(result.message.includes("Invalid login"), false);
      assert.equal(result.message.includes("secret-pass"), false);
    }
  });

  it("sends a successful sign-in to a safe dashboard path", async () => {
    const result = await runSignIn(
      {
        consume: () => ({ allowed: true }),
        signInWithPassword: async () => ({ error: null }),
      },
      {
        email: "a@example.com",
        password: "secret-pass",
        next: "/dashboard/courses",
        address: "203.0.113.10",
      },
    );
    assert.deepEqual(result, { status: "signed-in", redirectTo: "/dashboard/courses" });
  });

  it("treats a network failure as unavailable and does not echo the password", async () => {
    const result = await runSignIn(
      {
        consume: () => ({ allowed: true }),
        signInWithPassword: async () => ({ error: { name: "AuthRetryableFetchError", status: 0 } }),
      },
      { email: "a@example.com", password: "secret-pass", next: null, address: "203.0.113.11" },
    );
    assert.equal(result.status, "failed");
    if (result.status === "failed") assert.match(result.message, /could not reach/i);
  });
});
