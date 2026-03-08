import { useUserBadges, useAllBadges, useUserResults } from '@/hooks/useCourses';
import { Award, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export default function BadgesPage() {
  const { data: userBadges, isLoading: lb } = useUserBadges();
  const { data: allBadges, isLoading: ab } = useAllBadges();
  const { data: results } = useUserResults();

  const totalPoints = results?.reduce((sum, r) => sum + r.points_earned, 0) ?? 0;
  const earnedIds = new Set(userBadges?.map((ub) => ub.badge_id));

  if (lb || ab) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Badges</h1>
        <p className="mt-1 text-muted-foreground">Your total points: {totalPoints}</p>
      </div>

      {allBadges?.length === 0 ? (
        <p className="text-muted-foreground">No badges available yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allBadges?.map((badge, i) => {
            const earned = earnedIds.has(badge.id);
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-5 ${
                  earned ? 'border-primary bg-primary/5' : 'border-border bg-card opacity-60'
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  {earned ? (
                    <Award className="h-6 w-6 text-primary" />
                  ) : (
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  )}
                  <h3 className="font-display font-semibold text-foreground">{badge.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{badge.points_required} points required</p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
