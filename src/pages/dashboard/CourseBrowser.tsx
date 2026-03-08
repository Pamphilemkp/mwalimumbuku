import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublishedCourses } from '@/hooks/useCourses';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Search, CheckCircle2, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { useLanguage } from '@/i18n/LanguageContext';

export default function CourseBrowser() {
  const { data: courses, isLoading } = usePublishedCourses();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
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

  const enroll = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from('course_enrollments').insert({ course_id: courseId, user_id: user!.id });
      if (error) throw error;
      supabase.functions.invoke('notify-enrollment', { body: { type: 'enrollment', course_id: courseId } }).catch(() => {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success(t.courseBrowser.enrolledSuccess);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = courses?.filter(
    (c) => c.title.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t.courseBrowser.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.courseBrowser.desc}</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t.courseBrowser.searchPlaceholder} className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">{t.courseBrowser.noCourses}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered?.map((course, i) => {
            const isEnrolled = enrolledIds?.includes(course.id);
            return (
              <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="group rounded-xl border border-border bg-card p-6 hover:shadow-md transition-all flex flex-col">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{course.subject}</Badge>
                  <Badge variant="outline" className="text-xs">{course.level}</Badge>
                  {(course as any).is_premium && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                      <Crown className="mr-1 h-3 w-3" /> Premium
                    </Badge>
                  )}
                </div>
                <Link to={`/dashboard/courses/${course.id}`}>
                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{course.title}</h3>
                </Link>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground flex-1">{course.description || t.courseBrowser.noDesc}</p>
                <div className="mt-4">
                  {isEnrolled ? (
                    <div className="flex items-center gap-1.5 text-sm text-primary font-medium">
                      <CheckCircle2 className="h-4 w-4" /> {t.enrolled}
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => enroll.mutate(course.id)} disabled={enroll.isPending}>{t.enroll}</Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
