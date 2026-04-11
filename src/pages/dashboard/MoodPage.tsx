import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const MOOD_KEYS = ['Happy', 'Neutral', 'Sad', 'Frustrated', 'Excited'] as const;
const MOOD_EMOJIS: Record<string, string> = { Happy: '😊', Neutral: '😐', Sad: '😢', Frustrated: '😤', Excited: '🤩' };

export default function MoodPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [selectedMood, setSelectedMood] = useState('');
  const [note, setNote] = useState('');

  const { data: moodHistory, isLoading, isError } = useQuery({
    queryKey: ['moods', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('daily_moods').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(14);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user, retry: 1, staleTime: 30000,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('daily_moods').insert({ user_id: user!.id, mood: selectedMood, note: note || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t.mood.moodLogged); setSelectedMood(''); setNote(''); qc.invalidateQueries({ queryKey: ['moods'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t.mood.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.mood.howFeeling}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap gap-3">
          {MOOD_KEYS.map((key) => (
            <button key={key} onClick={() => setSelectedMood(key)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-5 py-3 transition-all ${selectedMood === key ? 'border-primary bg-primary/5 scale-105' : 'border-border hover:border-primary/30'}`}>
              <span className="text-3xl">{MOOD_EMOJIS[key]}</span>
              <span className="text-xs text-muted-foreground">{t.mood.moods[key]}</span>
            </button>
          ))}
        </div>
        <Textarea placeholder={t.mood.addNote} className="mt-4" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button className="mt-4" onClick={() => submit.mutate()} disabled={!selectedMood || submit.isPending}>{t.mood.logMood}</Button>
      </div>
      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">{t.mood.recentMoods}</h2>
        {isLoading ? <Skeleton className="h-20" /> : isError ? (
          <p className="text-muted-foreground">{t.mood.errorLoad}</p>
        ) : !moodHistory || moodHistory.length === 0 ? (
          <p className="text-muted-foreground">{t.mood.noMoods}</p>
        ) : (
          <div className="space-y-2">
            {moodHistory.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <span className="text-xl">{MOOD_EMOJIS[m.mood] ?? '😐'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t.mood.moods[m.mood as keyof typeof t.mood.moods] || m.mood}</p>
                  {m.note && <p className="text-xs text-muted-foreground">{m.note}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
