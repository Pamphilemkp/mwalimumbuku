export const HOMEWORK_MAX_BYTES = 5 * 1024 * 1024;
export const HOMEWORK_URL_SECONDS = 120;

const EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

export type FileDecision =
  | { ok: true; path: string }
  | { ok: false; reason: "type" | "size" | "owner" | "name" };

function extensionOf(name: string): string | null {
  const base = name.split("/").pop() ?? "";
  if (base.length === 0 || base.length > 120 || base.includes("..") || /[\u0000-\u001f]/.test(base)) return null;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  return base.slice(dot + 1).toLowerCase();
}

function safeSegment(value: string): boolean {
  return value.length > 0 && value.length <= 80 && !value.includes("..") && !value.includes("/") && !value.includes("\\");
}

export function validateHomeworkFile(input: {
  fileName: string;
  size: number;
  ownerId: string;
  callerId: string;
  assignmentId: string;
  objectName: string;
}): FileDecision {
  if (input.callerId !== input.ownerId || !safeSegment(input.ownerId) || !safeSegment(input.assignmentId)) {
    return { ok: false, reason: "owner" };
  }
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > HOMEWORK_MAX_BYTES) return { ok: false, reason: "size" };
  const extension = extensionOf(input.fileName);
  if (!extension || !EXTENSIONS.has(extension)) return { ok: false, reason: "type" };
  if (!safeSegment(input.objectName) || extensionOf(input.objectName) !== extension) return { ok: false, reason: "name" };
  return { ok: true, path: `${input.ownerId}/${input.assignmentId}/${input.objectName}` };
}

export function isStoredHomeworkPath(path: string): boolean {
  const parts = path.split("/");
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !safeSegment(part))) return false;
  const extension = extensionOf(parts[parts.length - 1] ?? "");
  return extension !== null && EXTENSIONS.has(extension);
}

export function resolveHomeworkObjectPath(fileUrl: string, studentId: string, storageOrigin: string): string | null {
  if (!safeSegment(studentId)) return null;
  const raw = fileUrl.trim();
  let path = raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    let parsed: URL;
    let origin: URL;
    try {
      parsed = new URL(raw);
      origin = new URL(storageOrigin);
    } catch {
      return null;
    }
    if (parsed.origin !== origin.origin) return null;
    const marker = "/storage/v1/object/";
    const at = parsed.pathname.indexOf(marker);
    if (at < 0) return null;
    let rest = decodeURIComponent(parsed.pathname.slice(at + marker.length));
    if (rest.startsWith("public/")) rest = rest.slice("public/".length);
    if (!rest.startsWith("homework-files/")) return null;
    path = rest.slice("homework-files/".length);
  }
  if (!isStoredHomeworkPath(path) || !path.startsWith(`${studentId}/`)) return null;
  return path;
}

export function authorizeHomeworkDownload(input: {
  path: string;
  callerId: string;
  nowMs: number;
}): { path: string; expiresAtMs: number } | null {
  if (!isStoredHomeworkPath(input.path) || !input.path.startsWith(`${input.callerId}/`)) return null;
  return { path: input.path, expiresAtMs: input.nowMs + HOMEWORK_URL_SECONDS * 1000 };
}
