import "server-only";
import { bindVerifiedUser } from "@/lib/auth/access";
import { readIdentity, sessionFromClaims } from "@/lib/auth/claims";
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

export async function loadAppSession(): Promise<AppSession> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const verified = sessionFromClaims(error, data?.claims?.sub);

  if (!verified.hasUser) {
    if (error) {
      console.error("Session verification failed", {
        code: typeof error.code === "string" ? error.code : "unknown",
        status: typeof error.status === "number" ? error.status : "unknown",
      });
    }
    return EMPTY_SESSION;
  }

  const identity = readIdentity(data?.claims);
  const userId = bindVerifiedUser(identity?.userId ?? null, null);
  if (!identity || !userId) return EMPTY_SESSION;

  const resolution = await getRoleForUser(userId);
  return {
    hasSession: true,
    userId,
    email: identity.email,
    name: identity.name,
    resolution,
  };
}
