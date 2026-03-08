import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Users, BarChart3, BookOpen, Award, TrendingUp, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

export default function ParentHome() {
  const { user } = useAuth();

  const { data: children, isLoading: loadingChildren } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_student')
        .select('student_id, profiles!parent_student_student_id_fkey(full_name, avatar_url)')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const studentIds = children?.map((c) => c.student_id) ?? [];

  const { data: enrollments } = useQuery({
    queryKey: ['parent-child-enrollments', studentIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*, courses(title, subject, level)')
        .in('user_id', studentIds);
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0,
  });

  const { data: results } = useQuery({
    queryKey: ['parent-child-results', studentIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .in('user_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0,
  });

  const { data: moods } = useQuery({
    queryKey: ['parent-child-moods', studentIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_moods')
        .select('*')
        .in('user_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0,
  });

  const totalEnrollments = enrollments?.length ?? 0;
  const totalExercises = results?.length ?? 0;
  const totalCorrect = results?.filter(r => r.is_correct).length ?? 0;
  const overallAccuracy = totalExercises > 0 ? Math.round((totalCorrect / totalExercises) * 100) : 0;
  const totalPoints = results?.reduce((s, r) => s + r.points_earned, 0) ?? 0;

  const moodEmoji: Record<string, string> = { happy: '😊', neutral: '😐', sad: '😢', excited: '🤩', tired: '😴', anxious: '😰' };

  if (loadingChildren) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Welcome, {user?.user_metadata?.full_name || 'Parent'}!
        </h1>
        <p className="mt-1 text-muted-foreground">Monitor your children's learning journey.</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Linked Children', value: children?.length ?? 0, icon: Users, color: 'text-secondary' },
          { label: 'Total Enrollments', value: totalEnrollments, icon: BookOpen, color: 'text-primary' },
          { label: 'Total Points', value: totalPoints, icon: Award, color: 'text-accent' },
          { label: 'Overall Accuracy', value: `${overallAccuracy}%`, icon: TrendingUp, color: 'text-primary' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5">
            <s.icon className={`mb-2 h-5 w-5 ${s.color}`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Per-Child Breakdown */}
      {children?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No children linked yet.</p>
          <Link to="/dashboard/children" className="mt-2 inline-block text-sm text-primary hover:underline">
            Link a child →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-semibold text-foreground">Children Overview</h2>
          {children?.map((child: any) => {
            const childResults = results?.filter(r => r.user_id === child.student_id) ?? [];
            const childEnrollments = enrollments?.filter(e => e.user_id === child.student_id) ?? [];
            const childMoods = moods?.filter(m => m.user_id === child.student_id) ?? [];
            const correct = childResults.filter(r => r.is_correct).length;
            const total = childResults.length;
            const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
            const points = childResults.reduce((s, r) => s + r.points_earned, 0);
            const latestMood = childMoods[0];

            return (
              <motion.div key={child.student_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Child Header */}
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-6 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                    <Users className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {child.profiles?.full_name || 'Student'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {childEnrollments.length} courses · {total} exercises completed
                    </p>
                  </div>
                  {latestMood && (
                    <div className="text-right">
                      <span className="text-2xl">{moodEmoji[latestMood.mood] || '😊'}</span>
                      <p className="text-[10px] text-muted-foreground">Latest mood</p>
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  {/* Stats Row */}
                  <div className="grid gap-3 grid-cols-3">
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">{points}</p>
                      <p className="text-xs text-muted-foreground">Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">{correct}/{total}</p>
                      <p className="text-xs text-muted-foreground">Correct</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">{accuracy}%</p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                  </div>

                  {total > 0 && <Progress value={accuracy} className="h-2" />}

                  {/* Enrolled Courses */}
                  {childEnrollments.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Enrolled Courses</p>
                      <div className="flex flex-wrap gap-2">
                        {childEnrollments.map((e: any) => (
                          <span key={e.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <BookOpen className="h-3 w-3" />
                            {e.courses?.title || 'Course'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  {childResults.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</p>
                      <div className="space-y-1">
                        {childResults.slice(0, 3).map(r => (
                          <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                            <span className={r.is_correct ? 'text-primary' : 'text-destructive'}>
                              {r.is_correct ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                            <span className="text-muted-foreground">+{r.points_earned} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Manage Children', href: '/dashboard/children', icon: Users, desc: 'Link or view child accounts' },
            { label: 'Detailed Progress', href: '/dashboard/child-progress', icon: BarChart3, desc: 'In-depth performance data' },
            { label: 'Send Message', href: '/dashboard/messages', icon: MessageCircle, desc: 'Contact a teacher' },
          ].map((item, i) => (
            <Link key={item.href} to={item.href}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                <item.icon className="mb-3 h-8 w-8 text-secondary" />
                <h3 className="font-display font-semibold text-foreground">{item.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
