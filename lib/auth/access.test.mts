import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APP_ROLES, authorize, bindVerifiedUser } from "./access.ts";

describe("authorize", () => {
  it("sends an anonymous visitor to login", () => {
    assert.equal(
      authorize({ hasSession: false, resolution: null, allowedRoles: APP_ROLES }),
      "login",
    );
  });

  it("allows a verified role that is on the list", () => {
    for (const role of APP_ROLES) {
      assert.equal(
        authorize({
          hasSession: true,
          resolution: { status: "ok", role },
          allowedRoles: APP_ROLES,
        }),
        "allow",
      );
    }
  });

  it("fails closed on a role mismatch", () => {
    assert.equal(
      authorize({
        hasSession: true,
        resolution: { status: "ok", role: "student" },
        allowedRoles: ["admin"],
      }),
      "holding",
    );
    assert.equal(
      authorize({
        hasSession: true,
        resolution: { status: "ok", role: "parent" },
        allowedRoles: ["teacher"],
      }),
      "holding",
    );
  });

  it("fails closed when the role is missing, duplicated, invalid, or the lookup failed", () => {
    for (const status of ["missing", "duplicate", "invalid", "error"] as const) {
      assert.equal(
        authorize({ hasSession: true, resolution: { status }, allowedRoles: APP_ROLES }),
        "holding",
      );
    }
    assert.equal(
      authorize({ hasSession: true, resolution: null, allowedRoles: APP_ROLES }),
      "holding",
    );
  });
});

describe("bindVerifiedUser", () => {
  it("uses the verified id and rejects a different supplied id", () => {
    assert.equal(bindVerifiedUser("user-a", null), "user-a");
    assert.equal(bindVerifiedUser("user-a", "user-a"), "user-a");
    assert.equal(bindVerifiedUser("user-a", "user-b"), null);
    assert.equal(bindVerifiedUser(null, "user-b"), null);
    assert.equal(bindVerifiedUser("user-a", 42), null);
  });
});
