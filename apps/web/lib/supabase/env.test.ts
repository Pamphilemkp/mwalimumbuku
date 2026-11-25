import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

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
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(source).not.toMatch(/process\.env\[/);
  });

  it("returns the configured public values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    expect(getSupabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("throws when either public value is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => getSupabasePublicEnv()).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });
});
