import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runSignOut } from "@/features/auth/sign-out";

describe("runSignOut", () => {
  it("reports success only when signOut returns no error", async () => {
    const result = await runSignOut(async () => ({ error: null }));
    expect(result).toEqual({ status: "signed-out" });
  });

  it("keeps the session path closed when signOut returns an error", async () => {
    const result = await runSignOut(async () => ({
      error: { name: "AuthApiError", status: 500 },
    }));

    expect(result).toEqual({
      status: "failed",
      message: "Sign-out did not complete. Try again.",
    });
  });

  it("uses the unreachable message for a network failure", async () => {
    const result = await runSignOut(async () => ({
      error: { name: "AuthRetryableFetchError", status: 0 },
    }));

    expect(result).toEqual({
      status: "failed",
      message: "We could not reach the sign-out service. Try again in a few minutes.",
    });
  });

  it("returns a failure when signOut throws", async () => {
    const result = await runSignOut(async () => {
      throw new Error("network down");
    });

    expect(result).toEqual({
      status: "failed",
      message: "Sign-out is unavailable right now. Try again in a few minutes.",
    });
  });

  it("calls the default global signOut and does not request a local scope", async () => {
    const source = readFileSync(path.resolve(import.meta.dirname, "logout-button.tsx"), "utf8");
    expect(source).toContain("supabase.auth.signOut()");
    expect(source).not.toMatch(/scope:\s*["']local["']/);
  });
});
