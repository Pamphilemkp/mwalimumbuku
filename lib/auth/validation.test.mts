import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEmail, parseNewPassword, parsePasswordForSignIn } from "./validation.ts";
import { resolvePublicOrigin } from "./origin.ts";
import { authEmailOrigin, VERCEL_SITE_ORIGIN } from "./site.ts";

describe("parseEmail", () => {
  it("accepts a normal address and rejects control characters", () => {
    assert.equal(parseEmail("  A@Example.com "), "a@example.com");
    assert.equal(parseEmail("a@b"), null);
    assert.equal(parseEmail("a@b.com\n"), null);
    assert.equal(parseEmail(""), null);
  });
});

describe("passwords", () => {
  it("allows a short existing password at sign-in and requires 8 characters for a new one", () => {
    assert.equal(parsePasswordForSignIn("short"), "short");
    assert.equal(parsePasswordForSignIn(""), null);
    assert.equal(parsePasswordForSignIn("x".repeat(73)), null);
    assert.equal(parseNewPassword("short"), null);
    assert.equal(parseNewPassword("longpassword"), "longpassword");
    assert.equal(parseNewPassword(`long\npassword`), null);
  });
});

describe("resolvePublicOrigin", () => {
  it("prefers the configured site and rejects a production http host", () => {
    assert.equal(
      resolvePublicOrigin({
        siteUrl: "https://staging.example",
        forwardedHost: "evil.example",
        forwardedProto: "https",
        host: "evil.example",
        production: true,
      }),
      "https://staging.example",
    );
    assert.equal(
      resolvePublicOrigin({
        siteUrl: undefined,
        forwardedHost: "app.example",
        forwardedProto: "http",
        host: "app.example",
        production: true,
      }),
      null,
    );
    assert.equal(
      resolvePublicOrigin({
        siteUrl: "https://evil.example/phish",
        forwardedHost: null,
        forwardedProto: null,
        host: null,
        production: true,
      }),
      null,
    );
  });
});

describe("authEmailOrigin", () => {
  it("sends production mail to the Vercel domain and drops a Lovable host", () => {
    assert.equal(
      authEmailOrigin({
        siteUrl: "https://mwalimumbuku.lovable.app",
        requestOrigin: "https://mwalimumbuku.lovable.app",
        production: true,
      }),
      VERCEL_SITE_ORIGIN,
    );
    assert.equal(
      authEmailOrigin({
        siteUrl: undefined,
        requestOrigin: "https://mwalimumbuku-git-preview.vercel.app",
        production: true,
      }),
      VERCEL_SITE_ORIGIN,
    );
    assert.equal(
      authEmailOrigin({
        siteUrl: "https://mwalimumbuku.vercel.app",
        requestOrigin: "https://evil.example",
        production: true,
      }),
      VERCEL_SITE_ORIGIN,
    );
  });

  it("keeps a configured https origin and localhost in development", () => {
    assert.equal(
      authEmailOrigin({
        siteUrl: "https://staging.example",
        requestOrigin: "https://evil.example",
        production: true,
      }),
      "https://staging.example",
    );
    assert.equal(
      authEmailOrigin({
        siteUrl: undefined,
        requestOrigin: "http://localhost:3000",
        production: false,
      }),
      "http://localhost:3000",
    );
  });
});
