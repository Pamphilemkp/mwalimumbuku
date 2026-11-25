import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '@/src/hooks/useAuth';

export function useSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function isPremium(subscription: any) {
  return subscription?.tier === 'premium' && subscription?.is_active;
}
