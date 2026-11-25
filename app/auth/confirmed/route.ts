import { NextResponse } from "next/server";
import { clientAddress } from "@/lib/auth/client-address";
import { AUTH_LIMITS } from "@/lib/auth/limits";
import { authRateLimiter } from "@/lib/auth/limiter";
import { applyAuthNavigationHeaders } from "@/lib/http/security-headers";
import { createClient } from "@/lib/supabase/server";

const CONFIRMED_PATH = "/login?notice=email-confirmed";

function isToken(value: string): boolean {
  if (value.length < 8 || value.length > 2048) return false;
  return !/[\s\u0000-\u001f\u007f]/.test(value);
}

function redirectTo(request: Request): NextResponse {
  const response = NextResponse.redirect(new URL(CONFIRMED_PATH, request.url));
  applyAuthNavigationHeaders(response.headers);
  return response;
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code || !isToken(code)) return redirectTo(request);

  const address = clientAddress(request.headers.get("x-forwarded-for"));
  const limit = authRateLimiter(`confirm:${address}`, AUTH_LIMITS.callback.limit, AUTH_LIMITS.callback.windowMs);
  if (!limit.allowed) return redirectTo(request);

  try {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  } catch {
    // The verify endpoint already confirmed the address before this redirect.
  }

  return redirectTo(request);
}
