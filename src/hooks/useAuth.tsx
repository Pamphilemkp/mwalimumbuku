import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, getUserRole } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  isReady: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  isReady: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('signOut error', e);
    }
    // Force full reset regardless of signOut result
    setSession(null);
    setRole(null);
    // Clear all cached data
    try {
      const qc = (window as any).__queryClient;
      if (qc) qc.clear();
    } catch {}
    // Hard redirect to clear all state
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Restore session first
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        try {
          const userRole = await getUserRole(sess.user.id);
          if (mounted) setRole(userRole);
        } catch (err) {
          console.error('getUserRole error:', err);
          if (mounted) setRole(null);
        }
      }
      if (mounted) {
        setLoading(false);
        setIsReady(true);
      }
    });

    // 2. Listen for subsequent changes (non-blocking)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sess) => {
        if (!mounted) return;
        setSession(sess);
        if (event === 'SIGNED_OUT') {
          setRole(null);
          setLoading(false);
          setIsReady(true);
          return;
        }
        if (sess?.user) {
          // Fire-and-forget role fetch — don't await in callback
          getUserRole(sess.user.id).then(r => {
            if (mounted) setRole(r);
          }).catch(() => {
            if (mounted) setRole(null);
          });
        } else {
          setRole(null);
        }
        if (mounted) {
          setLoading(false);
          setIsReady(true);
        }
      }
    );

    // Safety timeout — 4 seconds max
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth loading timeout — forcing ready');
        setLoading(false);
        setIsReady(true);
      }
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      role,
      loading,
      isReady,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
