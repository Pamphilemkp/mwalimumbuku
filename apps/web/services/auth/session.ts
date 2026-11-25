import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getRoleForUser, type RoleResolution } from "@/services/auth/get-role";

export type AppSession = {
  hasSession: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  resolution: RoleResolution | null;
};

const EMPTY_SESSION: AppSession = {
  hasSession: false,
  userId: null,
  email: null,
  name: null,
  resolution: null,
};

function readIdentity(claims: unknown): {
  userId: string;
  email: string | null;
  name: string | null;
} | null {
  if (!claims || typeof claims !== "object") return null;
  const record = claims as Record<string, unknown>;
  if (typeof record.sub !== "string" || record.sub.length === 0) return null;

  const email = typeof record.email === "string" && record.email.length > 0 ? record.email : null;
  let name: string | null = null;
  const metadata = record.user_metadata;
  if (metadata && typeof metadata === "object") {
    const fullName = (metadata as Record<string, unknown>).full_name;
    if (typeof fullName === "string" && fullName.trim().length > 0) {
      name = fullName.trim();
    }
  }

  return { userId: record.sub, email, name };
}

export async function loadAppSession(): Promise<AppSession> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("Session verification failed", {
      code: typeof error.code === "string" ? error.code : "unknown",
      status: typeof error.status === "number" ? error.status : "unknown",
    });
    return EMPTY_SESSION;
  }

  const identity = readIdentity(data?.claims);
  if (!identity) return EMPTY_SESSION;

  const resolution = await getRoleForUser(identity.userId);
  return {
    hasSession: true,
    userId: identity.userId,
    email: identity.email,
    name: identity.name,
    resolution,
  };
}
