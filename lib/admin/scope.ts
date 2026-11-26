export type AdminScope = "platform" | "school" | "refused";

/**
 * Platform staff are the existing app role `admin`.
 * A school administrator is an active school_admin membership, not a second role.
 * A platform-only action never becomes available by passing another school's id.
 */
export function adminScope(input: {
  platformAdmin: boolean;
  administeredSchoolIds: readonly string[];
  schoolId: string | null;
  platformOnly: boolean;
}): AdminScope {
  if (input.platformOnly) return input.platformAdmin ? "platform" : "refused";
  if (input.platformAdmin) return "platform";
  if (input.schoolId && input.administeredSchoolIds.includes(input.schoolId)) return "school";
  return "refused";
}
