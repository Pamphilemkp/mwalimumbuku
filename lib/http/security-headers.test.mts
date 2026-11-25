import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyAuthNavigationHeaders,
  applyProxyResponseHeaders,
  BASELINE_SECURITY_HEADERS,
  PROXY_CACHE_CONTROL,
} from "./security-headers.ts";

describe("proxy response headers", () => {
  it("sets private no-store and the baseline security headers", () => {
    const headers = new Headers();
    headers.set("Cache-Control", "public, max-age=60");
    applyProxyResponseHeaders(headers);

    assert.equal(headers.get("Cache-Control"), PROXY_CACHE_CONTROL);
    assert.equal(PROXY_CACHE_CONTROL, "private, no-store");
    for (const header of BASELINE_SECURITY_HEADERS) {
      assert.equal(headers.get(header.key), header.value);
    }
    assert.equal(headers.get("X-Frame-Options"), "DENY");
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(headers.get("Content-Security-Policy"), "frame-ancestors 'none'");
    assert.equal(headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=(), payment=()");
  });

  it("stops auth redirects from sending the one-time code in Referer", () => {
    const headers = new Headers();
    applyAuthNavigationHeaders(headers);
    assert.equal(headers.get("Cache-Control"), "private, no-store");
    assert.equal(headers.get("Referrer-Policy"), "no-referrer");
    assert.equal(headers.get("X-Frame-Options"), "DENY");
  });

  it("seals every proxy return, including the anonymous redirect", () => {
    const source = readFileSync(path.resolve(import.meta.dirname, "../../proxy.ts"), "utf8");
    const sealed = source.match(/return seal\(/g) ?? [];
    assert.equal(sealed.length, 4);
    assert.equal(source.includes("return NextResponse"), false);
    assert.equal(source.includes("return supabaseResponse"), false);

    const copied = source.indexOf("copySessionHeaders(supabaseResponse, redirectResponse)");
    const sealedRedirect = source.indexOf("return seal(redirectResponse)", copied);
    assert.ok(copied > -1);
    assert.ok(sealedRedirect > copied);
  });
});
