/**
 * Accept only a same-origin path. Query strings, hashes, schemes, and
 * protocol-relative values are rejected so a post-login `next` cannot
 * send the browser to another site.
 */
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 512) return null;
  if (trimmed.includes("\\") || trimmed.includes("\0")) return null;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("\\") || decoded.includes("//") || decoded.includes("://")) return null;
  if (decoded.includes(":") || decoded.includes("?") || decoded.includes("#")) return null;
  if (/[\u0000-\u001f\u007f]/.test(decoded)) return null;

  const segments = decoded.split("/");
  if (segments.some((segment) => segment === ".." || segment === ".")) return null;
  return decoded;
}

export function singleQueryValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
