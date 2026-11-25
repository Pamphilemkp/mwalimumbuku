/**
 * Session cookies are read by the browser Supabase client, so they cannot
 * be httpOnly. The Secure flag is on in production only; local http would
 * drop a Secure cookie and the sign-in flow would not persist.
 */
export function supabaseCookieOptions(): { secure: boolean; httpOnly: false } {
  return {
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  };
}
