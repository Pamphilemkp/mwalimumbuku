import { describe, expect, it } from "vitest";
import { resolveRole, type Role } from "@/services/auth/get-role";

const roles: Role[] = ["student", "parent", "teacher", "admin"];

describe("resolveRole", () => {
  it("treats no rows as missing", () => {
    expect(resolveRole(null, null)).toEqual({ status: "missing" });
    expect(resolveRole(undefined, undefined)).toEqual({ status: "missing" });
    expect(resolveRole([], null)).toEqual({ status: "missing" });
  });

  it.each(roles)("accepts a single %s role", (role) => {
    expect(resolveRole([{ role }], null)).toEqual({ status: "ok", role });
  });

  it("treats two or more rows as duplicate", () => {
    expect(resolveRole([{ role: "student" }, { role: "parent" }], null)).toEqual({
      status: "duplicate",
    });
    expect(
      resolveRole([{ role: "teacher" }, { role: "admin" }, { role: "student" }], null),
    ).toEqual({ status: "duplicate" });
  });

  it("treats an unknown role string as invalid", () => {
    expect(resolveRole([{ role: "school_admin" }], null)).toEqual({ status: "invalid" });
    expect(resolveRole([{ role: "super_admin" }], null)).toEqual({ status: "invalid" });
    expect(resolveRole([{ role: "Admin" }], null)).toEqual({ status: "invalid" });
    expect(resolveRole([{ role: "" }], null)).toEqual({ status: "invalid" });
    expect(resolveRole([{ role: null }], null)).toEqual({ status: "invalid" });
  });

  it("treats a query error as error even when rows are present", () => {
    expect(resolveRole([{ role: "student" }], { code: "PGRST116" })).toEqual({ status: "error" });
    expect(resolveRole(null, new Error("lookup failed"))).toEqual({ status: "error" });
  });
});
