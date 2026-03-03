import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const moods = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '🤩', label: 'Excited' },
];

export default function MoodPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedMood, setSelectedMood] = useState('');
  const [note, setNote] = useState('');

  const { data: moodHistory, isLoading } = useQuery({
    queryKey: ['moods', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_moods')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(14);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('daily_moods')
        .insert({ user_id: user!.id, mood: selectedMood, note: note || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mood logged!');
      setSelectedMood('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['moods'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Daily Mood</h1>
        <p className="mt-1 text-muted-foreground">How are you feeling today?</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap gap-3">
          {moods.map((m) => (
            <button
              key={m.label}
              onClick={() => setSelectedMood(m.label)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-5 py-3 transition-all ${
                selectedMood === m.label ? 'border-primary bg-primary/5 scale-105' : 'border-border hover:border-primary/30'
              }`}
            >
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Add a note (optional)..."
          className="mt-4"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button className="mt-4" onClick={() => submit.mutate()} disabled={!selectedMood || submit.isPending}>
          Log Mood
        </Button>
      </div>

      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Recent Moods</h2>
        {isLoading ? (
          <Skeleton className="h-20" />
        ) : moodHistory?.length === 0 ? (
          <p className="text-muted-foreground">No moods logged yet.</p>
        ) : (
          <div className="space-y-2">
            {moodHistory?.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span className="text-xl">{moods.find((mood) => mood.label === m.mood)?.emoji ?? '😐'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{m.mood}</p>
                  {m.note && <p className="text-xs text-muted-foreground">{m.note}</p>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
