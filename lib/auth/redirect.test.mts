import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeInternalPath } from "./redirect.ts";
import { destinationAfterLogin, loginPageRedirect } from "./access.ts";

describe("safeInternalPath", () => {
  it("allows a dashboard path", () => {
    assert.equal(safeInternalPath("/dashboard"), "/dashboard");
    assert.equal(safeInternalPath("/dashboard/courses"), "/dashboard/courses");
    assert.equal(safeInternalPath("  /holding  "), "/holding");
  });

  it("rejects external and protocol-relative redirects", () => {
    for (const value of [
      "https://evil.example/phish",
      "http://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "/javascript:alert(1)",
      "/%2f%2fevil.example",
      "/%252f%252fevil.example",
      "/dashboard/../../login",
      "/dashboard/../login",
      "/./dashboard",
      "/dashboard?next=https://evil.example",
      "/dashboard#https://evil.example",
      "/dashboard\nset-cookie",
      "",
      "   ",
      null,
      12,
    ]) {
      assert.equal(safeInternalPath(value), null, `expected rejection of ${String(value)}`);
    }
  });
});

describe("destinationAfterLogin", () => {
  it("keeps a safe dashboard path and drops everything else", () => {
    assert.equal(destinationAfterLogin("/dashboard/courses"), "/dashboard/courses");
    assert.equal(destinationAfterLogin("https://evil.example"), "/dashboard");
    assert.equal(destinationAfterLogin("//evil.example"), "/dashboard");
    assert.equal(destinationAfterLogin("/login"), "/dashboard");
    assert.equal(destinationAfterLogin("/reset-password"), "/dashboard");
    assert.equal(destinationAfterLogin("/holding"), "/dashboard");
    assert.equal(destinationAfterLogin(null), "/dashboard");
  });
});

describe("loginPageRedirect", () => {
  it("sends an anonymous visitor nowhere from the login page", () => {
    assert.equal(
      loginPageRedirect({ hasSession: false, resolution: null, requested: "https://evil.example" }),
      null,
    );
  });

  it("ignores an external next when the role is verified", () => {
    assert.equal(
      loginPageRedirect({
        hasSession: true,
        resolution: { status: "ok", role: "student" },
        requested: "https://evil.example/steal",
      }),
      "/dashboard",
    );
  });

  it("does not follow next when the role cannot be used", () => {
    assert.equal(
      loginPageRedirect({
        hasSession: true,
        resolution: { status: "missing" },
        requested: "/dashboard/admin",
      }),
      "/holding",
    );
  });
});
