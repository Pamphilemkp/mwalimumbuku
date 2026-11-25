import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "../..");
const FORBIDDEN = ["SUPABASE_" + "SERVICE_ROLE", "service" + "_role", "NEXT_PUBLIC_SUPABASE_" + "ANON_KEY"];
const TEXT_EXT = new Set([".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs", ".css", ".json", ".md", ".txt"]);
const SCAN_DIRS = ["app", "features", "lib", "services"];
const SCAN_FILES = [
  "proxy.ts",
  "next.config.ts",
  "package.json",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "tsconfig.json",
  "vercel.json",
  ".env.example",
  "README.md",
];

function isTextFile(file: string): boolean {
  const base = path.basename(file);
  if (base === ".gitignore" || base === ".env.example") return true;
  return TEXT_EXT.has(path.extname(file));
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "coverage") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (isTextFile(full)) acc.push(full);
  }
  return acc;
}

describe("application secret hygiene", () => {
  it("does not mention a service-role key or the legacy anon env name", () => {
    const files = SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
    for (const file of SCAN_FILES) files.push(path.join(ROOT, file));

    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const needle of FORBIDDEN) {
        if (text.includes(needle)) {
          hits.push(`${path.relative(ROOT, file)} contains a forbidden token`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  it("does not add a service-role client module", () => {
    const adminPath = path.join(ROOT, "lib", "supabase", "admin.ts");
    assert.throws(() => statSync(adminPath));
  });
});
