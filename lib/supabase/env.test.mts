import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSupabasePublicEnv } from "./env.ts";

const URL_NAME = "NEXT_PUBLIC_SUPABASE_URL" as const;
const KEY_NAME = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" as const;

const originalUrl = process.env[URL_NAME];
const originalKey = process.env[KEY_NAME];

function restore(name: typeof URL_NAME | typeof KEY_NAME, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

afterEach(() => {
  restore(URL_NAME, originalUrl);
  restore(KEY_NAME, originalKey);
});

describe("getSupabasePublicEnv", () => {
  it("reads the public URL and publishable key through literal process.env access", () => {
    const source = readFileSync(path.resolve(import.meta.dirname, "env.ts"), "utf8");
    assert.match(source, /process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
    assert.match(source, /process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    assert.doesNotMatch(source, /process\.env\[/);
  });

  it("returns the configured public values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    assert.deepEqual(getSupabasePublicEnv(), {
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("throws when either public value is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    assert.throws(
      () => getSupabasePublicEnv(),
      /Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });
});
