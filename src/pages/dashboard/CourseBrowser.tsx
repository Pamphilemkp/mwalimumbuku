import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePublishedCourses } from '@/hooks/useCourses';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, isPremium as checkPremium } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Search, CheckCircle2, Crown, Lock, Filter, GraduationCap, Sparkles, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export default function CourseBrowser() {
  const { data: courses, isLoading, isError } = usePublishedCourses();
  const { user, role } = useAuth();
  const { data: subscription } = useSubscription();
  const userIsPremium = checkPremium(subscription) || role === 'admin' || role === 'teacher';
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [showEnrolledOnly, setShowEnrolledOnly] = useState(false);
  const { t } = useLanguage();

  const { data: enrolledIds } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('course_enrollments').select('course_id').eq('user_id', user!.id);
      if (error) throw error;
      return data.map((e) => e.course_id);
    },
    enabled: !!user,
  });

  // Enrollment count per course
  const { data: enrollmentCounts } = useQuery({
    queryKey: ['enrollment-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('course_enrollments').select('course_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((e) => { counts[e.course_id] = (counts[e.course_id] || 0) + 1; });
      return counts;
    },
  });

  const enroll = useMutation({
    mutationFn: async (courseId: string) => {
      const { data: existing } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (existing) return;
      const { error } = await supabase.from('course_enrollments').insert({ course_id: courseId, user_id: user!.id });
      if (error) throw error;
      supabase.functions.invoke('notify-enrollment', { body: { type: 'enrollment', course_id: courseId } }).catch(() => {});
    },
    onMutate: async (courseId: string) => {
      // Optimistic update — instantly show enrolled
      await qc.cancelQueries({ queryKey: ['enrollments', user?.id] });
      const prev = qc.getQueryData<string[]>(['enrollments', user?.id]);
      qc.setQueryData(['enrollments', user?.id], (old: string[] | undefined) => [...(old ?? []), courseId]);
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['enrollment-counts'] });
      toast.success(t.courseBrowser.enrolledSuccess);
    },
    onError: (e: any, _courseId, context) => {
      // Rollback optimistic update
      if (context?.prev) qc.setQueryData(['enrollments', user?.id], context.prev);
      toast.error(e.message);
    },
  });

  // Extract unique subjects and levels
  const subjects = useMemo(() => {
    if (!courses) return [];
    return [...new Set(courses.map((c) => c.subject))].sort();
  }, [courses]);

  const levels = ['beginner', 'intermediate', 'advanced'];

  const filtered = useMemo(() => {
    return courses?.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = selectedLevel === 'all' || c.level === selectedLevel;
      const matchesSubject = selectedSubject === 'all' || c.subject === selectedSubject;
      const matchesEnrolled = !showEnrolledOnly || enrolledIds?.includes(c.id);
      return matchesSearch && matchesLevel && matchesSubject && matchesEnrolled;
    });
  }, [courses, search, selectedLevel, selectedSubject, showEnrolledOnly, enrolledIds]);

  const enrolledCount = enrolledIds?.length ?? 0;
  const totalCourses = courses?.length ?? 0;
  const premiumCount = courses?.filter((c) => c.is_premium).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">{t.courseBrowser.title}</h1>
          </div>
          <p className="mt-1 text-muted-foreground">{t.courseBrowser.desc}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5 text-sm">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{totalCourses}</span>
            <span className="text-muted-foreground">{t.courses}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-accent/5 px-3 py-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            <span className="font-medium text-foreground">{enrolledCount}</span>
            <span className="text-muted-foreground">{t.enrolled}</span>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.courseBrowser.searchPlaceholder} className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border px-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
            {['all', ...levels].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  selectedLevel === level
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {level === 'all' ? t.courseBrowser.allLevels : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          {subjects.length > 1 && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <option value="all">{t.courseBrowser.allSubjects}</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowEnrolledOnly(!showEnrolledOnly)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              showEnrolledOnly
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {t.courseBrowser.myCourses}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : isError || !filtered || filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">{t.courseBrowser.noCourses}</p>
          {search && (
            <Button variant="link" onClick={() => { setSearch(''); setSelectedLevel('all'); setSelectedSubject('all'); }}>
              {t.courseBrowser.clearFilters}
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((course, i) => {
              const isEnrolled = enrolledIds?.includes(course.id);
              const studentCount = enrollmentCounts?.[course.id] ?? 0;
              return (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    'group relative rounded-2xl border bg-card p-6 transition-all hover:shadow-lg flex flex-col',
                    isEnrolled ? 'border-primary/20 bg-primary/[0.02]' : 'border-border',
                    course.is_premium && !userIsPremium && 'opacity-80'
                  )}
                >
                  {/* Premium ribbon */}
                  {course.is_premium && (
                    <div className="absolute -top-px -right-px">
                      <div className="flex items-center gap-1 rounded-bl-xl rounded-tr-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                        <Crown className="h-3 w-3" /> Premium
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {course.subject}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {course.level}
                    </span>
                  </div>

                  {/* Title */}
                  <Link to={`/dashboard/courses/${course.id}`}>
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                  </Link>

                  {/* Description */}
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground flex-1">
                    {course.description || t.courseBrowser.noDesc}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{studentCount} {t.courseBrowser.studentsEnrolled}</span>
                    </div>

                    {course.is_premium && !userIsPremium ? (
                      <Link to="/dashboard/subscription">
                        <Button size="sm" variant="outline" className="gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/5">
                          <Lock className="h-3 w-3" /> {t.courseBrowser.unlock}
                        </Button>
                      </Link>
                    ) : isEnrolled ? (
                      <Link to={`/dashboard/courses/${course.id}`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-primary border-primary/30">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {t.courseBrowser.continue}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => enroll.mutate(course.id)}
                        disabled={enroll.isPending}
                        className="gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> {t.enroll}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
