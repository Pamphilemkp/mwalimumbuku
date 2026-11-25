import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("privilege boundaries", () => {
  it("loads the role for the verified user id only", () => {
    const source = readFileSync(path.join(ROOT, "services/auth/session.ts"), "utf8");
    assert.match(source, /bindVerifiedUser\(identity\?\.userId \?\? null, null\)/);
    assert.match(source, /getRoleForUser\(userId\)/);
    assert.equal(source.includes("searchParams"), false);
  });

  it("does not accept a role or another user id in auth actions", () => {
    const files = [
      "features/auth/actions.ts",
      "features/auth/sign-in.ts",
      "features/auth/request-password-reset.ts",
      "features/auth/update-password.ts",
      "app/auth/callback/route.ts",
    ];
    const forbidden = ["user_roles", "signUp(", "auth.admin", "raw_user_meta_data"];
    for (const file of files) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      for (const needle of forbidden) {
        assert.equal(source.includes(needle), false, `${file} contains ${needle}`);
      }
    }
  });
});
