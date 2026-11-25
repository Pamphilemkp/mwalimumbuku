/**
 * Session cookies are read by the browser Supabase client, so they cannot
 * be httpOnly. SameSite=Lax keeps them on the top-level return from a
 * recovery email without sending them on cross-site POSTs. The Secure flag
 * is on in production only; local http would drop a Secure cookie and the
 * sign-in flow would not persist.
 */
export function supabaseCookieOptions(): {
  secure: boolean;
  httpOnly: false;
  sameSite: "lax";
  path: "/";
} {
  return {
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  };
}
