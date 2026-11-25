import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideAuthGate } from "./auth-gate.ts";
import type { Role, RoleResolution } from "./get-role.ts";

const roles: Role[] = ["student", "parent", "teacher", "admin"];

describe("decideAuthGate", () => {
  it("sends a visitor with no session to login", () => {
    assert.equal(decideAuthGate(false, null), "/login");
    assert.equal(decideAuthGate(false, { status: "ok", role: "admin" }), "/login");
  });

  it("sends a session with a single known role to the dashboard", () => {
    for (const role of roles) {
      const resolution: RoleResolution = { status: "ok", role };
      assert.equal(decideAuthGate(true, resolution), "/dashboard");
    }
  });

  it("sends a session with a non-ok resolution to holding", () => {
    const resolutions: RoleResolution[] = [
      { status: "missing" },
      { status: "duplicate" },
      { status: "invalid" },
      { status: "error" },
    ];

    for (const resolution of resolutions) {
      assert.equal(decideAuthGate(true, resolution), "/holding");
    }
    assert.equal(decideAuthGate(true, null), "/holding");
  });
});
