"use client";

import { useAuth } from '@/src/hooks/useAuth';
import { supabase } from '@/src/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/src/components/ui/progress';
import { Users, BookOpen, Award, TrendingUp, Calendar } from 'lucide-react';
import { Skeleton } from '@/src/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';

export default function ChildProgress() {
  const { user } = useAuth();

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_student')
        .select('student_id, profiles!parent_student_student_id_fkey(full_name)')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const studentIds = children?.map((c) => c.student_id) ?? [];

  const { data: results, isLoading } = useQuery({
    queryKey: ['child-results', studentIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .in('user_id', studentIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0,
  });

  const { data: enrollments } = useQuery({
    queryKey: ['child-enrollments-detail', studentIds],
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

  const { data: moods } = useQuery({
    queryKey: ['child-moods-detail', studentIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_moods')
        .select('*')
        .in('user_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0,
  });

  const moodEmoji: Record<string, string> = { happy: '😊', neutral: '😐', sad: '😢', excited: '🤩', tired: '😴', anxious: '😰' };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Children's Progress</h1>
        <p className="mt-1 text-muted-foreground">Detailed performance analytics for each child.</p>
      </div>

      {children?.length === 0 ? (
        <p className="text-muted-foreground">Link a child first to see their progress.</p>
      ) : (
        <Tabs defaultValue={children?.[0]?.student_id} className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            {children?.map((child: any) => (
              <TabsTrigger key={child.student_id} value={child.student_id} className="gap-2">
                <Users className="h-3.5 w-3.5" />
                {child.profiles?.full_name || 'Student'}
              </TabsTrigger>
            ))}
          </TabsList>

          {children?.map((child: any) => {
            const childResults = results?.filter((r) => r.user_id === child.student_id) ?? [];
            const childEnrollments = enrollments?.filter((e) => e.user_id === child.student_id) ?? [];
            const childMoods = moods?.filter((m) => m.user_id === child.student_id) ?? [];
            const total = childResults.length;
            const correct = childResults.filter((r) => r.is_correct).length;
            const points = childResults.reduce((s, r) => s + r.points_earned, 0);
            const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

            // Weekly breakdown
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thisWeek = childResults.filter(r => new Date(r.created_at) > weekAgo);
            const weekPoints = thisWeek.reduce((s, r) => s + r.points_earned, 0);
            const weekCorrect = thisWeek.filter(r => r.is_correct).length;

            return (
              <TabsContent key={child.student_id} value={child.student_id} className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Total Points', value: points, icon: Award, color: 'text-accent' },
                    { label: 'Accuracy', value: `${accuracy}%`, icon: TrendingUp, color: 'text-primary' },
                    { label: 'Exercises Done', value: total, icon: BookOpen, color: 'text-secondary' },
                    { label: 'This Week Points', value: weekPoints, icon: Calendar, color: 'text-primary' },
                  ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="rounded-xl border border-border bg-card p-5">
                      <s.icon className={`mb-2 h-5 w-5 ${s.color}`} />
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Accuracy Bar */}
                {total > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Overall Accuracy</span>
                      <span className="text-sm text-muted-foreground">{correct}/{total} correct</span>
                    </div>
                    <Progress value={accuracy} className="h-3" />
                  </div>
                )}

                {/* Weekly Summary */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-display font-semibold text-foreground mb-3">This Week</h3>
                  <div className="grid gap-3 grid-cols-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-foreground">{thisWeek.length}</p>
                      <p className="text-xs text-muted-foreground">Exercises</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{weekCorrect}</p>
                      <p className="text-xs text-muted-foreground">Correct</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{weekPoints}</p>
                      <p className="text-xs text-muted-foreground">Points</p>
                    </div>
                  </div>
                </div>

                {/* Enrolled Courses */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-display font-semibold text-foreground mb-3">Enrolled Courses</h3>
                  {childEnrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not enrolled in any courses yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {childEnrollments.map((e: any) => (
                        <div key={e.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{e.courses?.title || 'Course'}</p>
                            <p className="text-xs text-muted-foreground">{e.courses?.subject} · {e.courses?.level}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(e.enrolled_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mood History */}
                {childMoods.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="font-display font-semibold text-foreground mb-3">Recent Moods</h3>
                    <div className="flex flex-wrap gap-2">
                      {childMoods.slice(0, 10).map((m: any) => (
                        <div key={m.id} className="flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1.5 text-xs">
                          <span>{moodEmoji[m.mood] || '😊'}</span>
                          <span className="text-muted-foreground capitalize">{m.mood}</span>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="text-muted-foreground/60">{new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Exercise Results */}
                {childResults.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="font-display font-semibold text-foreground mb-3">Recent Exercises</h3>
                    <div className="space-y-1.5">
                      {childResults.slice(0, 10).map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-2.5 text-sm">
                          <span className={r.is_correct ? 'text-primary font-medium' : 'text-destructive font-medium'}>
                            {r.is_correct ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">+{r.points_earned} pts</span>
                            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
