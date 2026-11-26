"use server";

import { headers } from "next/headers";
import { clientAddress } from "@/lib/auth/client-address";
import { sessionFromClaims } from "@/lib/auth/claims";
import { authRateLimiter } from "@/lib/auth/limiter";
import { configuredSiteUrl, resolvePublicOrigin } from "@/lib/auth/origin";
import { authEmailOrigin, SIGNUP_CONFIRM_PATH } from "@/lib/auth/site";
import { createClient } from "@/lib/supabase/server";
import { runRegister, type PublicRole } from "@/features/auth/register";
import { runRequestPasswordReset } from "@/features/auth/request-password-reset";
import { emailOutcome, type EmailOutcome } from "@/lib/email/delivery";
import { runSignIn } from "@/features/auth/sign-in";
import { runSignOut } from "@/features/auth/sign-out";
import { runUpdatePassword } from "@/features/auth/update-password";

async function recordAuthEmail(outcome: EmailOutcome) {
  try {
    const supabase = await createClient();
    await supabase.rpc("record_email_delivery", {
      _kind: outcome.kind,
      _status: outcome.status,
      _detail: outcome.detail,
    });
  } catch {
    // The auth response stays the same when the outcome log is unreachable.
  }
}

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
      recordDelivery: recordAuthEmail,
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

export async function registerAccountAction(input: {
  role?: PublicRole;
  email?: string;
  password?: string;
  fullName?: string;
}) {
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

  return runRegister(
    {
      consume: authRateLimiter,
      signUp: async ({ email, password, fullName, role, redirectTo }) => {
        const supabase = await createClient();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
            emailRedirectTo: redirectTo,
          },
        });
        const failure = failureOf(error);
        await recordAuthEmail(emailOutcome("auth_signup", failure));
        return { error: failure };
      },
    },
    {
      role: input?.role,
      email: input?.email,
      password: input?.password,
      fullName: input?.fullName,
      address: clientAddress(headerList.get("x-forwarded-for")),
      redirectTo: `${origin}${SIGNUP_CONFIRM_PATH}`,
    },
  );
}
