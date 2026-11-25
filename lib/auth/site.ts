export const VERCEL_SITE_ORIGIN = "https://mwalimumbuku.vercel.app";
export const SIGNUP_CONFIRM_PATH = "/auth/confirmed";
export const RECOVERY_CALLBACK_PATH = "/auth/callback";

function isLovableHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "lovable.app" || host.endsWith(".lovable.app") || host.endsWith(".lovable.dev");
}

function isPreviewHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host.endsWith(".vercel.app") && host !== "mwalimumbuku.vercel.app";
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function parseOrigin(value: string | null | undefined, production: boolean): string | null {
  if (!value || value.trim().length === 0) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (production && url.protocol !== "https:") return null;
  if (!production && url.protocol === "http:" && !isLocalHost(url.hostname)) return null;
  return url.origin;
}

/**
 * Origin written into confirmation and recovery emails.
 * A Lovable host, or a Vercel preview host, is replaced by the production
 * Vercel domain. Local development keeps localhost.
 */
export function authEmailOrigin(input: {
  siteUrl: string | undefined;
  requestOrigin: string | null;
  production: boolean;
}): string {
  const configured = parseOrigin(input.siteUrl, input.production);
  if (configured && !isLovableHost(new URL(configured).hostname) && !isPreviewHost(new URL(configured).hostname)) {
    return configured;
  }

  const request = parseOrigin(input.requestOrigin, input.production);
  if (!input.production && request && isLocalHost(new URL(request).hostname)) return request;

  return VERCEL_SITE_ORIGIN;
}
