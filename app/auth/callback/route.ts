import { NextResponse } from "next/server";
import {
  CALLBACK_FAILURE_PATH,
  CALLBACK_SUCCESS_PATH,
  planAuthCallback,
} from "@/lib/auth/callback";
import { clientAddress } from "@/lib/auth/client-address";
import { AUTH_LIMITS } from "@/lib/auth/limits";
import { authRateLimiter } from "@/lib/auth/limiter";
import { applyAuthNavigationHeaders } from "@/lib/http/security-headers";
import { createClient } from "@/lib/supabase/server";

function redirectTo(request: Request, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  applyAuthNavigationHeaders(response.headers);
  return response;
}

export async function GET(request: Request) {
  const address = clientAddress(request.headers.get("x-forwarded-for"));
  const limit = authRateLimiter(`callback:${address}`, AUTH_LIMITS.callback.limit, AUTH_LIMITS.callback.windowMs);
  if (!limit.allowed) return redirectTo(request, CALLBACK_FAILURE_PATH);

  const url = new URL(request.url);
  const plan = planAuthCallback({
    code: url.searchParams.get("code"),
    tokenHash: url.searchParams.get("token_hash"),
    type: url.searchParams.get("type"),
    next: url.searchParams.get("next"),
  });

  if (plan.action === "reject") return redirectTo(request, CALLBACK_FAILURE_PATH);

  try {
    const supabase = await createClient();
    const { error } =
      plan.action === "exchange-code"
        ? await supabase.auth.exchangeCodeForSession(plan.code)
        : await supabase.auth.verifyOtp({ token_hash: plan.tokenHash, type: "recovery" });
    if (error) return redirectTo(request, CALLBACK_FAILURE_PATH);
  } catch {
    return redirectTo(request, CALLBACK_FAILURE_PATH);
  }

  return redirectTo(request, CALLBACK_SUCCESS_PATH);
}
