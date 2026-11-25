function isHost(value: string): boolean {
  if (value.length === 0 || value.length > 255) return false;
  if (value.includes("..") || value.includes("@") || value.includes("\\")) return false;
  return /^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(value);
}

function parseConfiguredOrigin(value: string, production: boolean): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (production && url.protocol !== "https:") return null;
  return url.origin;
}

export function resolvePublicOrigin(input: {
  siteUrl: string | undefined;
  forwardedHost: string | null;
  forwardedProto: string | null;
  host: string | null;
  production: boolean;
}): string | null {
  if (input.siteUrl && input.siteUrl.trim().length > 0) {
    return parseConfiguredOrigin(input.siteUrl.trim(), input.production);
  }

  const host = (input.forwardedHost ?? input.host ?? "").split(",")[0]?.trim() ?? "";
  if (!isHost(host)) return null;
  const proto = input.forwardedProto?.split(",")[0]?.trim() === "https" ? "https" : "http";
  if (input.production && proto !== "https") return null;
  return `${proto}://${host}`;
}

export function configuredSiteUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value || value.trim().length === 0) return undefined;
  return value.trim();
}
