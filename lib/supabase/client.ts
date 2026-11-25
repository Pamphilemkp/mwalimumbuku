import { createBrowserClient } from "@supabase/ssr";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Browser Supabase client. Session cookies are stored by @supabase/ssr.
 * The second argument is the public client key. This repo names it the
 * publishable key (VITE_SUPABASE_PUBLISHABLE_KEY); createBrowserClient
 * accepts that value the same way it accepts a legacy anon key.
 */
export function createClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createBrowserClient(url, publishableKey, {
    cookieOptions: supabaseCookieOptions(),
  });
}
