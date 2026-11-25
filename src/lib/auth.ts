import { authEmailOrigin, RECOVERY_CALLBACK_PATH, SIGNUP_CONFIRM_PATH } from "@/lib/auth/site";
import { supabase } from "@/src/integrations/supabase/client";

function browserAuthOrigin(): string {
  return authEmailOrigin({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    requestOrigin: window.location.origin,
    production: process.env.NODE_ENV === "production",
  });
}

export type AppRole = 'student' | 'parent' | 'teacher' | 'admin';

export async function signUp(email: string, password: string, fullName: string, role: AppRole) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
      emailRedirectTo: `${browserAuthOrigin()}${SIGNUP_CONFIRM_PATH}`,
    },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUserRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.role as AppRole;
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${browserAuthOrigin()}${RECOVERY_CALLBACK_PATH}`,
  });
  return { data, error };
}
