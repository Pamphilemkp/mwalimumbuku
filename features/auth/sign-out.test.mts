import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runSignOut } from "./sign-out.ts";

describe("runSignOut", () => {
  it("reports success only when signOut returns no error", async () => {
    const result = await runSignOut(async () => ({ error: null }));
    assert.deepEqual(result, { status: "signed-out" });
  });

  it("keeps the session path closed when signOut returns an error", async () => {
    const result = await runSignOut(async () => ({
      error: { name: "AuthApiError", status: 500 },
    }));

    assert.deepEqual(result, {
      status: "failed",
      message: "Sign-out did not complete. Try again.",
    });
  });

  it("uses the unreachable message for a network failure", async () => {
    const result = await runSignOut(async () => ({
      error: { name: "AuthRetryableFetchError", status: 0 },
    }));

    assert.deepEqual(result, {
      status: "failed",
      message: "We could not reach the sign-out service. Try again in a few minutes.",
    });
  });

  it("returns a failure when signOut throws", async () => {
    const result = await runSignOut(async () => {
      throw new Error("network down");
    });

    assert.deepEqual(result, {
      status: "failed",
      message: "Sign-out is unavailable right now. Try again in a few minutes.",
    });
  });

  it("calls the default global signOut and does not request a local scope", () => {
    const source = readFileSync(path.resolve(import.meta.dirname, "logout-button.tsx"), "utf8");
    assert.match(source, /supabase\.auth\.signOut\(\)/);
    assert.doesNotMatch(source, /scope:\s*["']local["']/);
  });

  it("returns before navigation when sign-out fails", () => {
    const source = readFileSync(path.resolve(import.meta.dirname, "logout-button.tsx"), "utf8");
    const failure = source.indexOf('if (result.status === "failed")');
    const earlyReturn = source.indexOf("return;", failure);
    const navigate = source.indexOf('router.push("/login")');

    assert.ok(failure > -1);
    assert.ok(earlyReturn > failure);
    assert.ok(navigate > earlyReturn);
    assert.equal(source.slice(failure, earlyReturn).includes("router.push"), false);
    assert.equal(source.slice(failure, earlyReturn).includes("router.refresh"), false);
    assert.equal(source.match(/router\.push\(/g)?.length, 1);
  });
});
