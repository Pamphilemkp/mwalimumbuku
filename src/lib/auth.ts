import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'student' | 'parent' | 'teacher' | 'admin';

export async function signUp(email: string, password: string, fullName: string, role: AppRole) {
  const siteUrl = import.meta.env.PROD ? 'https://mwalimumbuku.vercel.app' : window.location.origin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
      emailRedirectTo: siteUrl,
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
  const siteUrl = import.meta.env.PROD ? 'https://mwalimumbuku.vercel.app' : window.location.origin;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });
  return { data, error };
}
