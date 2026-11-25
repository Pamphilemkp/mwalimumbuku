import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "./rate-limit.ts";
import { clientAddress } from "./client-address.ts";
import { AUTH_LIMITS } from "./limits.ts";

describe("createRateLimiter", () => {
  it("blocks the attempt after the limit inside the window", () => {
    let now = 1_000;
    const consume = createRateLimiter(() => now);
    for (let i = 0; i < AUTH_LIMITS.signIn.limit; i += 1) {
      assert.equal(consume("sign-in:1.1.1.1", AUTH_LIMITS.signIn.limit, AUTH_LIMITS.signIn.windowMs).allowed, true);
    }
    assert.equal(consume("sign-in:1.1.1.1", AUTH_LIMITS.signIn.limit, AUTH_LIMITS.signIn.windowMs).allowed, false);
    assert.equal(consume("sign-in:2.2.2.2", AUTH_LIMITS.signIn.limit, AUTH_LIMITS.signIn.windowMs).allowed, true);
    now += AUTH_LIMITS.signIn.windowMs + 1;
    assert.equal(consume("sign-in:1.1.1.1", AUTH_LIMITS.signIn.limit, AUTH_LIMITS.signIn.windowMs).allowed, true);
  });
});

describe("clientAddress", () => {
  it("uses the first valid address and buckets junk as unknown", () => {
    assert.equal(clientAddress("203.0.113.5, 10.0.0.1"), "203.0.113.5");
    assert.equal(clientAddress("2001:db8::1"), "2001:db8::1");
    assert.equal(clientAddress("not an address"), "unknown");
    assert.equal(clientAddress(null), "unknown");
  });
});
