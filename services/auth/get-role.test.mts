import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveRole, type Role } from "./get-role.ts";

const roles: Role[] = ["student", "parent", "teacher", "admin"];

describe("resolveRole", () => {
  it("treats no rows as missing", () => {
    assert.deepEqual(resolveRole(null, null), { status: "missing" });
    assert.deepEqual(resolveRole(undefined, undefined), { status: "missing" });
    assert.deepEqual(resolveRole([], null), { status: "missing" });
  });

  it("accepts a single known role", () => {
    for (const role of roles) {
      assert.deepEqual(resolveRole([{ role }], null), { status: "ok", role });
    }
  });

  it("treats two or more rows as duplicate", () => {
    assert.deepEqual(resolveRole([{ role: "student" }, { role: "parent" }], null), {
      status: "duplicate",
    });
    assert.deepEqual(
      resolveRole([{ role: "teacher" }, { role: "admin" }, { role: "student" }], null),
      { status: "duplicate" },
    );
  });

  it("treats an unknown role string as invalid", () => {
    assert.deepEqual(resolveRole([{ role: "school_admin" }], null), { status: "invalid" });
    assert.deepEqual(resolveRole([{ role: "super_admin" }], null), { status: "invalid" });
    assert.deepEqual(resolveRole([{ role: "Admin" }], null), { status: "invalid" });
    assert.deepEqual(resolveRole([{ role: "" }], null), { status: "invalid" });
    assert.deepEqual(resolveRole([{ role: null }], null), { status: "invalid" });
  });

  it("treats a query error as error even when rows are present", () => {
    assert.deepEqual(resolveRole([{ role: "student" }], { code: "PGRST116" }), { status: "error" });
    assert.deepEqual(resolveRole(null, new Error("lookup failed")), { status: "error" });
  });
});
