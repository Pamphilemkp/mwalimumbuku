import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readIdentity, sessionFromClaims } from "./claims.ts";

describe("sessionFromClaims", () => {
  it("rejects an expired or invalid token", () => {
    assert.deepEqual(sessionFromClaims({ code: "bad_jwt" }, "user-a"), { hasUser: false });
    assert.deepEqual(sessionFromClaims(new Error("expired"), "user-a"), { hasUser: false });
    assert.deepEqual(sessionFromClaims(null, ""), { hasUser: false });
    assert.deepEqual(sessionFromClaims(null, null), { hasUser: false });
  });

  it("accepts a verified subject", () => {
    assert.deepEqual(sessionFromClaims(null, "user-a"), { hasUser: true });
  });
});

describe("readIdentity", () => {
  it("reads the subject from claims and ignores a mismatched caller id", () => {
    const identity = readIdentity({
      sub: "user-a",
      email: "a@example.com",
      user_metadata: { full_name: "Awa" },
      requested_user_id: "user-b",
    });
    assert.deepEqual(identity, { userId: "user-a", email: "a@example.com", name: "Awa" });
  });
});
