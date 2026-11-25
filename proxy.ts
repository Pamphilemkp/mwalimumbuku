import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applyProxyResponseHeaders } from "@/lib/http/security-headers";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Next.js 16 renamed middleware.ts to proxy.ts and the exported function
 * from middleware() to proxy(). The proxy runs on the Node.js runtime.
 * https://nextjs.org/docs/app/guides/upgrading/version-16
 *
 * Session refresh follows the Supabase App Router SSR guide: cookie
 * getAll/setAll, then auth.getClaims() so the access token is verified
 * and refreshed before Server Components read it.
 *
 * proxy.ts is not the authorization boundary. Protected pages load the
 * session and the user_roles row again and fail closed on their own.
 */

function isProtectedPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/holding" || pathname.startsWith("/holding/");
}

function sendsAnonymousVisitorToLogin(pathname: string): boolean {
  return pathname === "/" || isProtectedPath(pathname);
}

function copySessionHeaders(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) to.headers.set(header, value);
  }
}

function seal(response: NextResponse): NextResponse {
  applyProxyResponseHeaders(response.headers);
  return response;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  let url: string;
  let publishableKey: string;
  try {
    ({ url, publishableKey } = getSupabasePublicEnv());
  } catch {
    if (sendsAnonymousVisitorToLogin(request.nextUrl.pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return seal(NextResponse.redirect(loginUrl));
    }
    return seal(supabaseResponse);
  }

  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: supabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const hasUser = !error && typeof data?.claims?.sub === "string" && data.claims.sub.length > 0;

  if (!hasUser && sendsAnonymousVisitorToLogin(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const redirectResponse = NextResponse.redirect(loginUrl);
    copySessionHeaders(supabaseResponse, redirectResponse);
    return seal(redirectResponse);
  }

  return seal(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
