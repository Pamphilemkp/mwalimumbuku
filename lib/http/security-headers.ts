export const PROXY_CACHE_CONTROL = "private, no-store";

export const BASELINE_SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
] as const;

export function baselineSecurityHeaders(): { key: string; value: string }[] {
  return BASELINE_SECURITY_HEADERS.map((header) => ({
    key: header.key,
    value: header.value,
  }));
}

export function applyProxyResponseHeaders(headers: { set(name: string, value: string): void }): void {
  headers.set("Cache-Control", PROXY_CACHE_CONTROL);
  for (const header of BASELINE_SECURITY_HEADERS) {
    headers.set(header.key, header.value);
  }
}

/** Auth redirects must not leak the one-time code through Referer. */
export function applyAuthNavigationHeaders(headers: { set(name: string, value: string): void }): void {
  applyProxyResponseHeaders(headers);
  headers.set("Referrer-Policy", "no-referrer");
}
