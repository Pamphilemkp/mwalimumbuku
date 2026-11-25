import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");
const FORBIDDEN = ["SUPABASE_" + "SERVICE_ROLE", "service" + "_role", "NEXT_PUBLIC_SUPABASE_" + "ANON_KEY"];
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".json", ".md", ".txt"]);

function isTextFile(file: string): boolean {
  const base = path.basename(file);
  if (base === ".gitignore" || base === ".env.example") return true;
  return TEXT_EXT.has(path.extname(file));
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "package-lock.json" || entry === "coverage") {
      continue;
    }
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (isTextFile(full)) acc.push(full);
  }
  return acc;
}

describe("apps/web secret hygiene", () => {
  it("does not mention a service-role key or the legacy anon env name", () => {
    const hits: string[] = [];
    for (const file of walk(ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const needle of FORBIDDEN) {
        if (text.includes(needle)) {
          hits.push(`${path.relative(ROOT, file)} contains a forbidden token`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("does not add a service-role client module", () => {
    const adminPath = path.join(ROOT, "lib", "supabase", "admin.ts");
    expect(() => statSync(adminPath)).toThrow();
  });
});
