import { motion } from 'framer-motion';
import { BookOpen, Award, BarChart3, Smile, TrendingUp, Target, Flame, Zap, ArrowRight, Gamepad2, Wrench, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserResults, useUserBadges, usePublishedCourses } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useSubscription, isPremium as checkPremium } from '@/hooks/useSubscription';
import StudentAssignments from '@/components/StudentAssignments';

export default function StudentHome() {
  const { user, role } = useAuth();
  const { data: results } = useUserResults();
  const { data: badges } = useUserBadges();
  const { data: allCourses } = usePublishedCourses();
  const { data: subscription } = useSubscription();
  const { t } = useLanguage();

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('course_enrollments').select('course_id, courses(title, subject)').eq('user_id', user!.id);
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
    { label: t.studentHome.totalPoints, value: totalPoints, icon: Zap, gradient: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
    { label: t.accuracy, value: `${accuracy}%`, icon: Target, gradient: 'from-secondary/20 to-secondary/5', iconColor: 'text-secondary' },
    { label: t.studentHome.badgesEarned, value: badges?.length ?? 0, icon: Award, gradient: 'from-accent/20 to-accent/5', iconColor: 'text-accent' },
    { label: t.studentHome.enrolledCourses, value: enrollments?.length ?? 0, icon: BookOpen, gradient: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
  ];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.studentHome.goodMorning;
    if (hour < 17) return t.studentHome.goodAfternoon;
    return t.studentHome.goodEvening;
  };

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-6 sm:p-8"
      >
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground">{greeting()}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-1">
            {user?.user_metadata?.full_name || 'Student'} !
          </h1>
          <p className="mt-2 text-muted-foreground max-w-lg">{t.studentHome.overview}</p>
          {totalAttempts > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Flame className="h-4 w-4" /> {totalPoints} pts
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                <Award className="h-4 w-4" /> {badges?.length ?? 0} badges
              </div>
            </div>
          )}
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-accent/5 blur-2xl" />
      </motion.div>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn('rounded-2xl border border-border/50 bg-gradient-to-br p-5', s.gradient)}
          >
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-card shadow-sm', s.iconColor)}>
              <s.icon className="h-4.5 w-4.5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Accuracy bar */}
      {totalAttempts > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t.studentHome.overallAccuracy}</span>
            </div>
            <span className="text-sm font-medium text-primary">{correctCount}/{totalAttempts} {t.correct}</span>
          </div>
          <Progress value={accuracy} className="h-2.5" />
        </motion.div>
      )}

      {/* Enrolled courses preview */}
      {enrollments && enrollments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">{t.studentHome.enrolledCourses}</h2>
            <Link to="/dashboard/courses" className="flex items-center gap-1 text-sm text-primary hover:underline">
              {t.studentHome.viewAll} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.slice(0, 3).map((e: any, i: number) => (
              <Link key={e.course_id} to={`/dashboard/courses/${e.course_id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary mb-2">
                    {e.courses?.subject}
                  </span>
                  <h3 className="font-display text-sm font-semibold text-foreground line-clamp-1">{e.courses?.title}</h3>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommended courses (not enrolled yet) */}
      {allCourses && enrollments && (() => {
        const enrolledSet = new Set(enrollments.map((e: any) => e.course_id));
        const recommended = allCourses.filter(c => !enrolledSet.has(c.id) && !c.is_premium).slice(0, 3);
        if (recommended.length === 0) return null;
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold text-foreground">{t.studentHome.recommendedCourses}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((c, i) => (
                <Link key={c.id} to={`/dashboard/courses/${c.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.02] p-4 hover:shadow-md hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-[10px]">{c.subject}</Badge>
                      <Badge variant="outline" className="text-[10px]">{c.level}</Badge>
                    </div>
                    <h3 className="font-display text-sm font-semibold text-foreground line-clamp-1">{c.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.description || t.studentHome.discoverCourse}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">{t.studentHome.quickActions}</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: t.studentHome.browseCourses, href: '/dashboard/courses', icon: BookOpen, desc: t.studentHome.browseCoursesDesc, color: 'from-primary/10 to-primary/5' },
            { label: t.studentHome.myProgress, href: '/dashboard/progress', icon: BarChart3, desc: t.studentHome.myProgressDesc, color: 'from-secondary/10 to-secondary/5' },
            { label: t.studentHome.viewBadges, href: '/dashboard/badges', icon: Award, desc: t.studentHome.viewBadgesDesc, color: 'from-accent/10 to-accent/5' },
            { label: t.studentHome.educationalGames, href: '/dashboard/games', icon: Gamepad2, desc: t.studentHome.educationalGamesDesc, color: 'from-secondary/10 to-accent/5' },
            { label: t.studentHome.toolboxLabel, href: '/dashboard/toolbox', icon: Wrench, desc: t.studentHome.toolboxDesc, color: 'from-accent/10 to-primary/5' },
            { label: t.studentHome.logMood, href: '/dashboard/mood', icon: Smile, desc: t.studentHome.logMoodDesc, color: 'from-primary/10 to-primary/5' },
          ].map((item, i) => (
            <Link key={item.href} to={item.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className={cn(
                  'rounded-2xl border border-border/50 bg-gradient-to-br p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer h-full',
                  item.color
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-sm">{item.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      {results && results.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">{t.studentHome.recentActivity}</h2>
          <div className="space-y-2">
            {results.slice(0, 5).map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                {r.is_correct ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Award className="h-3.5 w-3.5 text-primary" />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10">
                    <Target className="h-3.5 w-3.5 text-destructive" />
                  </div>
                )}
                <span className="text-sm text-foreground flex-1 truncate">{(r as any).exercises?.question ?? t.studentHome.exercise}</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">+{r.points_earned}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
