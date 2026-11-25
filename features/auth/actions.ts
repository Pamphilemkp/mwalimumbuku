"use server";

import { headers } from "next/headers";
import { clientAddress } from "@/lib/auth/client-address";
import { sessionFromClaims } from "@/lib/auth/claims";
import { authRateLimiter } from "@/lib/auth/limiter";
import { configuredSiteUrl, resolvePublicOrigin } from "@/lib/auth/origin";
import { authEmailOrigin } from "@/lib/auth/site";
import { createClient } from "@/lib/supabase/server";
import { runRequestPasswordReset } from "@/features/auth/request-password-reset";
import { runSignIn } from "@/features/auth/sign-in";
import { runSignOut } from "@/features/auth/sign-out";
import { runUpdatePassword } from "@/features/auth/update-password";

function failureOf(error: { name?: string; status?: number } | null): { name?: string; status?: number } | null {
  if (!error) return null;
  return {
    name: typeof error.name === "string" ? error.name : undefined,
    status: typeof error.status === "number" ? error.status : undefined,
  };
}

export async function signInAction(input: { email?: string; password?: string; next?: string }) {
  const headerList = await headers();
  return runSignIn(
    {
      consume: authRateLimiter,
      signInWithPassword: async (email, password) => {
        const supabase = await createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: failureOf(error) };
      },
    },
    {
      email: input?.email,
      password: input?.password,
      next: input?.next,
      address: clientAddress(headerList.get("x-forwarded-for")),
    },
  );
}

export async function signOutAction() {
  return runSignOut(async () => {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    return { error: failureOf(error) };
  });
}

export async function requestPasswordResetAction(input: { email?: string }) {
  const headerList = await headers();
  const production = process.env.NODE_ENV === "production";
  const requestOrigin = resolvePublicOrigin({
    siteUrl: undefined,
    forwardedHost: headerList.get("x-forwarded-host"),
    forwardedProto: headerList.get("x-forwarded-proto"),
    host: headerList.get("host"),
    production,
  });
  const origin = authEmailOrigin({
    siteUrl: configuredSiteUrl(),
    requestOrigin,
    production,
  });

  return runRequestPasswordReset(
    {
      consume: authRateLimiter,
      resetPasswordForEmail: async (email, redirectTo) => {
        const supabase = await createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        return { error: failureOf(error) };
      },
    },
    {
      email: input?.email,
      address: clientAddress(headerList.get("x-forwarded-for")),
    },
    origin,
  );
}

export async function updatePasswordAction(input: { password?: string; confirm?: string }) {
  const headerList = await headers();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const hasSession = sessionFromClaims(error, data?.claims?.sub).hasUser;

  return runUpdatePassword(
    {
      consume: authRateLimiter,
      updatePassword: async (password) => {
        const client = await createClient();
        const { error: updateError } = await client.auth.updateUser({ password });
        return { error: failureOf(updateError) };
      },
      signOut: async () => {
        const client = await createClient();
        const { error: signOutError } = await client.auth.signOut();
        return { error: failureOf(signOutError) };
      },
    },
    {
      password: input?.password,
      confirm: input?.confirm,
      address: clientAddress(headerList.get("x-forwarded-for")),
      hasSession,
    },
  );
}
