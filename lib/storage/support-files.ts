export const SUPPORT_MAX_BYTES = 5 * 1024 * 1024;
export const SUPPORT_URL_SECONDS = 120;

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  webm: "audio/webm",
};

export type SupportDecision =
  | { ok: true; path: string }
  | { ok: false; reason: "type" | "size" | "owner" | "name" };

function extensionOf(name: string): string | null {
  const base = name.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  return base.slice(dot + 1).toLowerCase();
}

function safeName(name: string): string | null {
  const base = name.split("/").pop() ?? "";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (cleaned.length === 0 || cleaned.length > 80 || cleaned.includes("..")) return null;
  return cleaned;
}

export function validateSupportFile(input: {
  fileName: string;
  size: number;
  contentType: string;
  ownerId: string;
  callerId: string;
  objectName: string;
}): SupportDecision {
  if (input.callerId !== input.ownerId || !/^[0-9a-f-]{36}$/i.test(input.ownerId)) return { ok: false, reason: "owner" };
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > SUPPORT_MAX_BYTES) return { ok: false, reason: "size" };
  const extension = extensionOf(input.fileName);
  const declared = input.contentType.split(";")[0]?.trim().toLowerCase();
  if (!extension || MIME[extension] !== declared) return { ok: false, reason: "type" };
  const objectName = safeName(input.objectName);
  if (!objectName || extensionOf(objectName) !== extension) return { ok: false, reason: "name" };
  return { ok: true, path: `${input.ownerId}/${objectName}` };
}

export function supportObjectPath(fileUrl: string): string | null {
  const raw = fileUrl.trim();
  if (raw.length === 0 || raw.includes("..")) return null;
  let path = raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const marker = "/support-files/";
    const at = raw.indexOf(marker);
    if (at < 0) return null;
    path = decodeURIComponent(raw.slice(at + marker.length).split("?")[0] ?? "");
  }
  const parts = path.split("/");
  if (parts.length !== 2 || !/^[0-9a-f-]{36}$/i.test(parts[0] ?? "")) return null;
  if (!safeName(parts[1] ?? "")) return null;
  return path;
}
