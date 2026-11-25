import { describe, expect, it } from "vitest";
import { decideAuthGate } from "@/services/auth/auth-gate";
import type { Role, RoleResolution } from "@/services/auth/get-role";

const roles: Role[] = ["student", "parent", "teacher", "admin"];

describe("decideAuthGate", () => {
  it("sends a visitor with no session to login", () => {
    expect(decideAuthGate(false, null)).toBe("/login");
    expect(decideAuthGate(false, { status: "ok", role: "admin" })).toBe("/login");
  });

  it.each(roles)("sends a session with a single %s role to the dashboard", (role) => {
    const resolution: RoleResolution = { status: "ok", role };
    expect(decideAuthGate(true, resolution)).toBe("/dashboard");
  });

  it("sends a session with a non-ok resolution to holding", () => {
    const resolutions: RoleResolution[] = [
      { status: "missing" },
      { status: "duplicate" },
      { status: "invalid" },
      { status: "error" },
    ];

    for (const resolution of resolutions) {
      expect(decideAuthGate(true, resolution)).toBe("/holding");
    }
    expect(decideAuthGate(true, null)).toBe("/holding");
  });
});
