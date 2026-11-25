"use client";

import { Link } from '@/src/lib/next-router';
import { useAuth } from '@/src/hooks/useAuth';
import { useTeacherCourses } from '@/src/hooks/useCourses';
import { supabase } from '@/src/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, PlusCircle, ClipboardList, Users, MessageCircle, TrendingUp, Flame, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/src/components/ui/skeleton';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { cn } from '@/src/lib/utils';

export default function TeacherHome() {
  const { user } = useAuth();
  const { data: courses, isLoading } = useTeacherCourses();
  const { t } = useLanguage();
  const courseIds = courses?.map((c) => c.id) ?? [];

  const { data: enrollmentCount } = useQuery({
    queryKey: ['teacher-enrollment-count', courseIds],
    queryFn: async () => {
      const { count, error } = await supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).in('course_id', courseIds);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: courseIds.length > 0,
  });

  const published = courses?.filter((c) => c.is_published).length ?? 0;
  const drafts = courses?.filter((c) => !c.is_published).length ?? 0;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  const stats = [
    { label: t.teacherHome.totalCourses, value: courses?.length ?? 0, icon: BookOpen, gradient: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
    { label: t.published, value: published, icon: TrendingUp, gradient: 'from-accent/20 to-accent/5', iconColor: 'text-accent' },
    { label: t.teacherHome.drafts, value: drafts, icon: ClipboardList, gradient: 'from-secondary/20 to-secondary/5', iconColor: 'text-secondary' },
    { label: t.teacherHome.enrolledStudents, value: enrollmentCount ?? 0, icon: Users, gradient: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
  ];

  const actions = [
    { label: t.teacherHome.myCourses, href: '/dashboard/my-courses', icon: BookOpen, desc: t.teacherHome.myCoursesDesc, color: 'from-primary/10 to-primary/5' },
    { label: t.teacherHome.createCourse, href: '/dashboard/create-course', icon: PlusCircle, desc: t.teacherHome.createCourseDesc, color: 'from-accent/10 to-accent/5' },
    { label: t.teacherHome.studentResults, href: '/dashboard/results', icon: ClipboardList, desc: t.teacherHome.studentResultsDesc, color: 'from-secondary/10 to-secondary/5' },
    { label: t.teacherHome.messagesAction, href: '/dashboard/messages', icon: MessageCircle, desc: t.teacherHome.messagesDesc, color: 'from-primary/10 to-primary/5' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-6 sm:p-8"
      >
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground">👋 {t.teacherHome.welcome}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-1">
            {user?.user_metadata?.full_name || 'Teacher'}
          </h1>
          <p className="mt-2 text-muted-foreground">{t.teacherHome.manageDesc}</p>
          {(courses?.length ?? 0) > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Flame className="h-4 w-4" /> {published} published
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                <Users className="h-4 w-4" /> {enrollmentCount ?? 0} students
              </div>
            </div>
          )}
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      </motion.div>

      {/* Stats */}
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

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">{t.studentHome.quickActions}</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {actions.map((item, i) => (
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
                <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent courses */}
      {courses && courses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">{t.teacherHome.recentCourses}</h2>
            <Link to="/dashboard/my-courses" className="flex items-center gap-1 text-sm text-primary hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {courses.slice(0, 5).map((c) => (
              <Link key={c.id} to={`/dashboard/courses/${c.id}/edit`}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/30 hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.subject} · {c.level}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                    c.is_published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {c.is_published ? t.published : t.draft}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
