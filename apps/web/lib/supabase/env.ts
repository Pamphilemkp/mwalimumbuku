const SUPABASE_URL = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export function getSupabasePublicEnv(): { url: string; publishableKey: string } {
  const url = process.env[SUPABASE_URL];
  const publishableKey = process.env[SUPABASE_PUBLISHABLE_KEY];

  if (!url || !publishableKey) {
    throw new Error(`Missing ${SUPABASE_URL} or ${SUPABASE_PUBLISHABLE_KEY}`);
  }

  return { url, publishableKey };
}
