import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anonymousMustSignIn, loginNextPath } from "./routes.ts";

describe("anonymous access", () => {
  it("requires sign-in for home and protected paths only", () => {
    for (const path of ["/", "/dashboard", "/dashboard/courses", "/holding"]) {
      assert.equal(anonymousMustSignIn(path), true, path);
    }
    for (const path of ["/login", "/forgot-password", "/reset-password", "/auth/callback"]) {
      assert.equal(anonymousMustSignIn(path), false, path);
    }
  });

  it("keeps the return path on this site", () => {
    assert.equal(loginNextPath("/dashboard"), "/dashboard");
    assert.equal(loginNextPath("/dashboard/courses"), "/dashboard/courses");
    assert.equal(loginNextPath("/holding"), "/holding");
    assert.equal(loginNextPath("/login"), null);
    assert.equal(loginNextPath("//evil.example"), null);
  });
});
