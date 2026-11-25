import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { supabaseCookieOptions } from "./cookie-options.ts";

const env = process.env as { NODE_ENV?: string };
const originalNodeEnv = env.NODE_ENV;

afterEach(() => {
  env.NODE_ENV = originalNodeEnv;
});

describe("supabaseCookieOptions", () => {
  it("sets secure only in production and leaves httpOnly false", () => {
    env.NODE_ENV = "production";
    assert.deepEqual(supabaseCookieOptions(), {
      secure: true,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });

    env.NODE_ENV = "development";
    assert.deepEqual(supabaseCookieOptions(), {
      secure: false,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });

    env.NODE_ENV = "test";
    assert.deepEqual(supabaseCookieOptions(), {
      secure: false,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
  });

  it("passes the same cookie options to the browser, server, and proxy clients", () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const files = ["lib/supabase/client.ts", "lib/supabase/server.ts", "proxy.ts"];
    for (const file of files) {
      const source = readFileSync(path.join(root, file), "utf8");
      assert.match(source, /cookieOptions:\s*supabaseCookieOptions\(\)/);
    }
  });
});
