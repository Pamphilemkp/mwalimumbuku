import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runUpdatePassword } from "./update-password.ts";

describe("runUpdatePassword", () => {
  it("does not change a password when the session is missing", async () => {
    let updates = 0;
    const result = await runUpdatePassword(
      {
        consume: () => ({ allowed: true }),
        updatePassword: async () => {
          updates += 1;
          return { error: null };
        },
        signOut: async () => ({ error: null }),
      },
      { password: "longpassword", confirm: "longpassword", address: "203.0.113.30", hasSession: false },
    );
    assert.equal(result.status, "failed");
    assert.equal(updates, 0);
    if (result.status === "failed") assert.match(result.message, /invalid or has expired/i);
  });

  it("updates only the verified session password and then signs out", async () => {
    const updates: string[] = [];
    let signedOut = false;
    const result = await runUpdatePassword(
      {
        consume: () => ({ allowed: true }),
        updatePassword: async (password) => {
          updates.push(password);
          return { error: null };
        },
        signOut: async () => {
          signedOut = true;
          return { error: null };
        },
      },
      { password: "longpassword", confirm: "longpassword", address: "203.0.113.31", hasSession: true },
    );
    assert.deepEqual(result, { status: "updated" });
    assert.deepEqual(updates, ["longpassword"]);
    assert.equal(signedOut, true);
  });

  it("rejects a mismatch and a short password before calling the provider", async () => {
    let updates = 0;
    const deps = {
      consume: () => ({ allowed: true as const }),
      updatePassword: async () => {
        updates += 1;
        return { error: null };
      },
      signOut: async () => ({ error: null }),
    };
    const mismatch = await runUpdatePassword(deps, {
      password: "longpassword",
      confirm: "different12",
      address: "203.0.113.32",
      hasSession: true,
    });
    const short = await runUpdatePassword(deps, {
      password: "short",
      confirm: "short",
      address: "203.0.113.32",
      hasSession: true,
    });
    assert.equal(mismatch.status, "failed");
    assert.equal(short.status, "failed");
    assert.equal(updates, 0);
  });

  it("does not return the provider error text", async () => {
    const result = await runUpdatePassword(
      {
        consume: () => ({ allowed: true }),
        updatePassword: async () => ({ error: { name: "AuthApiError", status: 422 } }),
        signOut: async () => ({ error: null }),
      },
      { password: "longpassword", confirm: "longpassword", address: "203.0.113.33", hasSession: true },
    );
    assert.equal(result.status, "failed");
    if (result.status === "failed") {
      assert.equal(result.message.includes("422"), false);
      assert.equal(result.message.includes("longpassword"), false);
    }
  });
});
