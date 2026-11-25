import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePublicRole, runRegister } from "./register.ts";

describe("parsePublicRole", () => {
  it("allows a student or a parent and rejects every other role", () => {
    assert.equal(parsePublicRole("student"), "student");
    assert.equal(parsePublicRole("parent"), "parent");
    assert.equal(parsePublicRole("teacher"), null);
    assert.equal(parsePublicRole("admin"), null);
    assert.equal(parsePublicRole("school_admin"), null);
  });
});

describe("runRegister", () => {
  it("uses the same accepted response when the address is already registered", async () => {
    let calls = 0;
    const result = await runRegister(
      {
        consume: () => ({ allowed: true }),
        signUp: async () => {
          calls += 1;
          return { error: { name: "AuthApiError", status: 422 } };
        },
      },
      {
        role: "student",
        email: "Ada@Example.com",
        password: "longpassword",
        fullName: "Ada L",
        address: "203.0.113.10",
        redirectTo: "https://mwalimumbuku.vercel.app/auth/confirmed",
      },
    );
    assert.equal(calls, 1);
    assert.equal(result.status, "accepted");
    if (result.status === "accepted") {
      assert.equal(result.message.toLowerCase().includes("ada@example.com"), false);
      assert.equal(result.message.toLowerCase().includes("already"), false);
    }
  });

  it("does not call the provider for a teacher role or a short password", async () => {
    let calls = 0;
    const deps = {
      consume: () => ({ allowed: true as const }),
      signUp: async () => {
        calls += 1;
        return { error: null };
      },
    };
    const teacher = await runRegister(deps, {
      role: "teacher",
      email: "a@example.com",
      password: "longpassword",
      fullName: "Ada L",
      address: "203.0.113.10",
      redirectTo: "https://mwalimumbuku.vercel.app/auth/confirmed",
    });
    const short = await runRegister(deps, {
      role: "parent",
      email: "a@example.com",
      password: "short",
      fullName: "Ada L",
      address: "203.0.113.10",
      redirectTo: "https://mwalimumbuku.vercel.app/auth/confirmed",
    });
    assert.equal(teacher.status, "failed");
    assert.equal(short.status, "failed");
    assert.equal(calls, 0);
  });
});
