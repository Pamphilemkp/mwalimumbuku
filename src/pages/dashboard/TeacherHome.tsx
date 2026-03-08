import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeacherCourses } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, PlusCircle, ClipboardList, Users, MessageCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';

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
    { label: t.teacherHome.totalCourses, value: courses?.length ?? 0, icon: BookOpen, color: 'text-primary' },
    { label: t.published, value: published, icon: TrendingUp, color: 'text-primary' },
    { label: t.teacherHome.drafts, value: drafts, icon: ClipboardList, color: 'text-secondary' },
    { label: t.teacherHome.enrolledStudents, value: enrollmentCount ?? 0, icon: Users, color: 'text-accent' },
  ];

  const actions = [
    { label: t.teacherHome.myCourses, href: '/dashboard/my-courses', icon: BookOpen, desc: t.teacherHome.myCoursesDesc, color: 'text-primary' },
    { label: t.teacherHome.createCourse, href: '/dashboard/create-course', icon: PlusCircle, desc: t.teacherHome.createCourseDesc, color: 'text-accent' },
    { label: t.teacherHome.studentResults, href: '/dashboard/results', icon: ClipboardList, desc: t.teacherHome.studentResultsDesc, color: 'text-secondary' },
    { label: t.teacherHome.messagesAction, href: '/dashboard/messages', icon: MessageCircle, desc: t.teacherHome.messagesDesc, color: 'text-primary' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          {t.teacherHome.welcome}, {user?.user_metadata?.full_name || 'Teacher'} !
        </h1>
        <p className="mt-1 text-muted-foreground">{t.teacherHome.manageDesc}</p>
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

      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">{t.studentHome.quickActions}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((item, i) => (
            <Link key={item.href} to={item.href}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                <item.icon className={`mb-3 h-8 w-8 ${item.color}`} />
                <h3 className="font-display font-semibold text-foreground">{item.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {courses && courses.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">{t.teacherHome.recentCourses}</h2>
          <div className="space-y-2">
            {courses.slice(0, 5).map((c) => (
              <Link key={c.id} to={`/dashboard/courses/${c.id}/edit`}>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.subject} · {c.level}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${c.is_published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {c.is_published ? t.published : t.draft}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
