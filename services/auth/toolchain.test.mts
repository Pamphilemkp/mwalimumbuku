import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("root Next.js toolchain", () => {
  it("pins Next 16.4.6 and React 19.2.9 and does not depend on Vite", () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];

    assert.equal(pkg.dependencies?.next, "16.4.6");
    assert.equal(pkg.devDependencies?.["eslint-config-next"], "16.4.6");
    assert.equal(pkg.dependencies?.react, "19.2.9");
    assert.equal(pkg.dependencies?.["react-dom"], "19.2.9");
    assert.equal(pkg.devDependencies?.["@types/react"], "19.2.9");
    assert.equal(pkg.devDependencies?.["@types/react-dom"], "19.2.7");
    assert.equal(pkg.scripts?.dev, "next dev");
    assert.equal(names.includes("vite"), false);
    assert.equal(names.includes("@vitejs/plugin-react-swc"), false);
    assert.equal(names.includes("react-router-dom"), false);
  });

  it("does not keep a Vite config, an SPA rewrite, or a second app directory", () => {
    for (const missing of [
      "vite.config.ts",
      "vitest.config.ts",
      "index.html",
      "apps",
      "apps/web",
      "frontend",
      "src",
    ]) {
      assert.throws(() => statSync(path.join(ROOT, missing)), `${missing} should not exist`);
    }

    const vercel = readFileSync(path.join(ROOT, "vercel.json"), "utf8");
    assert.match(vercel, /"framework"\s*:\s*"nextjs"/);
    assert.equal(vercel.includes("index.html"), false);
    assert.equal(vercel.includes("rewrites"), false);
  });
});
