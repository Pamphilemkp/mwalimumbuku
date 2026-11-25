export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const PROFILE_PREVIEW_COLUMNS = ["user_id", "full_name", "avatar_url"] as const;
export const PRIVATE_PROFILE_FIELDS = ["student_code", "phone", "address", "city", "school_name"] as const;

export type ParentLink = {
  studentId: string;
  status: string | null;
};

export function isActiveLink(status: string | null | undefined): boolean {
  return status == null || status === "active";
}

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function parseBody(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return null;
  const text = value.replace(/\r\n/g, "\n").trim();
  if (text.length === 0 || text.length > max) return null;
  return text;
}

export function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function previewExposesPrivateFields(columns: readonly string[]): boolean {
  return columns.some((column) => (PRIVATE_PROFILE_FIELDS as readonly string[]).includes(column));
}

/**
 * Child ids come from the caller's own links. A requested id outside that
 * list is rejected and does not become the selected child.
 */
export function resolveChildSelection(links: readonly ParentLink[], requestedId: string | null) {
  const childIds = links.filter((link) => isActiveLink(link.status)).map((link) => link.studentId);
  if (childIds.length === 0) return { childIds, selectedId: null, denied: false };
  if (!requestedId) return { childIds, selectedId: childIds[0], denied: false };
  if (!childIds.includes(requestedId)) return { childIds, selectedId: null, denied: true };
  return { childIds, selectedId: requestedId, denied: false };
}
