import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useOnboarding() {
  const { user, isReady } = useAuth();
  return useQuery({
    queryKey: ['onboarding-status', user?.id],
    enabled: isReady && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_step')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? { onboarding_completed: false, onboarding_step: 0 };
    },
    staleTime: 30_000,
  });
}
