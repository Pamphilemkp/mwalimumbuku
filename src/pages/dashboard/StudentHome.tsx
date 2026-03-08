import { motion } from 'framer-motion';
import { BookOpen, Award, BarChart3, Smile, TrendingUp, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserResults, useUserBadges, usePublishedCourses } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/i18n/LanguageContext';

export default function StudentHome() {
  const { user } = useAuth();
  const { data: results } = useUserResults();
  const { data: badges } = useUserBadges();
  const { t } = useLanguage();

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('course_enrollments').select('course_id').eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalPoints = results?.reduce((sum, r) => sum + r.points_earned, 0) ?? 0;
  const correctCount = results?.filter((r) => r.is_correct).length ?? 0;
  const totalAttempts = results?.length ?? 0;
  const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  const stats = [
    { label: t.studentHome.totalPoints, value: totalPoints, icon: BarChart3, color: 'text-primary' },
    { label: t.accuracy, value: `${accuracy}%`, icon: Target, color: 'text-secondary' },
    { label: t.studentHome.badgesEarned, value: badges?.length ?? 0, icon: Award, color: 'text-accent' },
    { label: t.studentHome.enrolledCourses, value: enrollments?.length ?? 0, icon: BookOpen, color: 'text-primary' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          {t.studentHome.welcomeBack}{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''} !
        </h1>
        <p className="mt-1 text-muted-foreground">{t.studentHome.overview}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5">
            <s.icon className={`mb-2 h-5 w-5 ${s.color}`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {totalAttempts > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{t.studentHome.overallAccuracy}</span>
            </div>
            <span className="text-sm text-muted-foreground">{correctCount}/{totalAttempts} {t.correct}</span>
          </div>
          <Progress value={accuracy} className="h-2" />
        </div>
      )}

      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">{t.studentHome.quickActions}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t.studentHome.browseCourses, href: '/dashboard/courses', icon: BookOpen, desc: t.studentHome.browseCoursesDesc },
            { label: t.studentHome.myProgress, href: '/dashboard/progress', icon: BarChart3, desc: t.studentHome.myProgressDesc },
            { label: t.studentHome.viewBadges, href: '/dashboard/badges', icon: Award, desc: t.studentHome.viewBadgesDesc },
            { label: t.studentHome.logMood, href: '/dashboard/mood', icon: Smile, desc: t.studentHome.logMoodDesc },
          ].map((item, i) => (
            <Link key={item.href} to={item.href}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                <item.icon className="mb-3 h-8 w-8 text-primary" />
                <h3 className="font-display font-semibold text-foreground">{item.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {results && results.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">{t.studentHome.recentActivity}</h2>
          <div className="space-y-2">
            {results.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                {r.is_correct ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10"><Award className="h-3 w-3 text-primary" /></div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10"><Target className="h-3 w-3 text-destructive" /></div>
                )}
                <span className="text-sm text-foreground flex-1 truncate">{(r as any).exercises?.question ?? t.studentHome.exercise}</span>
                <span className="text-xs font-medium text-muted-foreground">+{r.points_earned} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
