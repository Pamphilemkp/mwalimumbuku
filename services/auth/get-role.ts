export type Role = "student" | "parent" | "teacher" | "admin";

export type RoleResolution =
  | { status: "ok"; role: Role }
  | { status: "missing" }
  | { status: "duplicate" }
  | { status: "invalid" }
  | { status: "error" };

export type RoleRow = {
  role?: string | null;
};

const ROLES: readonly Role[] = ["student", "parent", "teacher", "admin"];

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Decide what a user_roles read means.
 * public.user_roles has UNIQUE (user_id, role), so one person can have
 * more than one row. maybeSingle() is the wrong call for that table:
 * zero rows, a query error, and two or more rows all stay closed.
 */
export function resolveRole(
  rows: readonly RoleRow[] | null | undefined,
  error: unknown,
): RoleResolution {
  if (error != null) return { status: "error" };
  if (rows == null) return { status: "missing" };
  if (!Array.isArray(rows)) return { status: "error" };
  if (rows.length === 0) return { status: "missing" };
  if (rows.length > 1) return { status: "duplicate" };

  const role = rows[0]?.role;
  if (typeof role === "string" && isRole(role)) {
    return { status: "ok", role };
  }
  return { status: "invalid" };
}

function logRoleFailure(code: string) {
  console.error("Role lookup failed", { code });
}

export async function getRoleForUser(userId: string): Promise<RoleResolution> {
  if (!userId) {
    logRoleFailure("missing-user");
    return { status: "error" };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      logRoleFailure(typeof error.code === "string" ? error.code : "unknown");
    }

    const rows = Array.isArray(data)
      ? data.map((row: { role?: string | null }) => ({
          role: typeof row?.role === "string" ? row.role : null,
        }))
      : null;

    return resolveRole(rows, error);
  } catch (cause) {
    logRoleFailure(cause instanceof Error ? cause.name : "exception");
    return { status: "error" };
  }
}
