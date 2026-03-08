import { useState } from 'react';
import { useTeacherCourses, useTogglePublish } from '@/hooks/useCourses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, BookOpen, Plus, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/sonner';

export default function TeacherCourses() {
  const { data: courses, isLoading } = useTeacherCourses();
  const togglePublish = useTogglePublish();

  const handleToggle = (id: string, current: boolean) => {
    togglePublish.mutate({ id, is_published: !current }, {
      onSuccess: () => toast.success(current ? 'Course unpublished' : 'Course published!'),
    });
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Courses</h1>
          <p className="mt-1 text-muted-foreground">Manage your teaching content.</p>
        </div>
        <Link to="/dashboard/create-course">
          <Button><Plus className="mr-2 h-4 w-4" /> New Course</Button>
        </Link>
      </div>

      {courses?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">No courses yet</p>
          <Link to="/dashboard/create-course"><Button className="mt-4">Create your first course</Button></Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses?.map((course, i) => (
            <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{course.subject}</Badge>
                <Badge variant={course.is_published ? 'default' : 'outline'}>
                  {course.is_published ? 'Published' : 'Draft'}
                </Badge>
                {(course as any).is_premium && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Crown className="mr-1 h-3 w-3" /> Premium
                  </Badge>
                )}
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{course.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
              <div className="mt-4 flex gap-2">
                <Link to={`/dashboard/courses/${course.id}/edit`}>
                  <Button size="sm" variant="outline">Edit</Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => handleToggle(course.id, course.is_published)}>
                  {course.is_published ? <><EyeOff className="mr-1 h-3 w-3" /> Unpublish</> : <><Eye className="mr-1 h-3 w-3" /> Publish</>}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
