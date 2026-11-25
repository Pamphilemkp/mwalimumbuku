import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';

export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('*');
      if (error) throw error;
      const map: Record<string, any> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
    staleTime: 60000,
  });
}

export function useGameSettings() {
  const { data } = usePlatformSettings();
  return data?.game_settings ?? { easy_time: 120, medium_time: 90, hard_time: 60, points_multiplier: 1 };
}

export function useToolboxSettings() {
  const { data } = usePlatformSettings();
  return data?.toolbox_settings ?? { calculator: true, spellcheck: true, dictation: true, tts: true, recorder: true };
}
