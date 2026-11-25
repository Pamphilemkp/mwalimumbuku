"use client";

import { useUserBadges, useAllBadges, useUserResults } from '@/src/hooks/useCourses';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { Award, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '@/src/integrations/supabase/client';
import { toast } from '@/src/components/ui/sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/ui/button';
import { motion } from 'framer-motion';
import { Skeleton } from '@/src/components/ui/skeleton';
import { StudentRewardPanel } from '@/features/rewards/panels';

export default function BadgesPage() {
  const { t } = useLanguage();
  const { data: userBadges, isLoading: lb } = useUserBadges();
  const { data: allBadges, isLoading: ab } = useAllBadges();
  const { data: results } = useUserResults();
  const queryClient = useQueryClient();

  const totalPoints = results?.reduce((sum, r) => sum + r.points_earned, 0) ?? 0;
  const earnedIds = new Set(userBadges?.map((ub) => ub.badge_id));

  const claimBadge = async (badgeId: string) => {
    const { error } = await supabase.rpc('award_badge_if_eligible', { _badge_id: badgeId });
    if (error) { toast.error(error.message); }
    else { toast.success(t.badges.badgeEarned); queryClient.invalidateQueries({ queryKey: ['user-badges'] }); }
  };

  if (lb || ab) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t.badges.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.badges.yourPoints} {totalPoints}</p>
      </div>
      <StudentRewardPanel />
      {allBadges?.length === 0 ? (
        <p className="text-muted-foreground">{t.badges.noBadges}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allBadges?.map((badge, i) => {
            const earned = earnedIds.has(badge.id);
            const achievement = Boolean(badge.achievement_code);
            const eligible = !achievement && totalPoints >= badge.points_required && !earned;
            return (
              <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-5 ${earned ? 'border-primary bg-primary/5' : 'border-border bg-card opacity-60'}`}>
                <div className="mb-3 flex items-center gap-2">
                  {earned ? <Award className="h-6 w-6 text-primary" /> : <Lock className="h-6 w-6 text-muted-foreground" />}
                  <h3 className="font-display font-semibold text-foreground">{badge.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{badge.points_required} {t.badges.pointsRequired}</p>
                {earned && <p className="mt-2 flex items-center gap-1 text-xs text-primary"><CheckCircle className="h-3 w-3" /> {t.badges.earned}</p>}
                {eligible && <Button size="sm" className="mt-3" onClick={() => claimBadge(badge.id)}>{t.badges.claimBadge}</Button>}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
